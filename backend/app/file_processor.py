import os
import logging
from typing import List
from fastapi import UploadFile, HTTPException
from pypdf import PdfReader
import docx
from openai import OpenAI
from pydantic import ValidationError
from .ai_schemas import SegmentList, describe_validation_error, strip_code_fence
from .log_safety import describe_error
from .config import settings
from .prompts import prompt_builder

logger = logging.getLogger(__name__)

client = OpenAI(api_key=settings.openai_api_key)


class FileProcessor:
    """Handles file upload and text extraction from various file types."""
    
    ALLOWED_EXTENSIONS = {'.pdf', '.txt', '.docx'}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    @staticmethod
    def get_file_extension(filename: str) -> str:
        """Get the file extension from filename."""
        return os.path.splitext(filename.lower())[1]
    
    @staticmethod
    async def validate_file(file: UploadFile) -> None:
        """Validate uploaded file."""
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        extension = FileProcessor.get_file_extension(file.filename)
        
        if extension not in FileProcessor.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"File type not supported. Allowed types: {', '.join(FileProcessor.ALLOWED_EXTENSIONS)}"
            )
        
        # Check file size by reading it temporarily
        content = await file.read()
        if len(content) > FileProcessor.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"File too large. Maximum size: {FileProcessor.MAX_FILE_SIZE / (1024 * 1024)}MB"
            )
        
        # Reset file position for subsequent reads
        await file.seek(0)
    
    @staticmethod
    async def extract_text_from_pdf(file_content: bytes) -> str:
        """Extract text from PDF file."""
        try:
            import io
            pdf_reader = PdfReader(io.BytesIO(file_content))
            text = ""
            
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text += page.extract_text()
            
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {describe_error(e)}")
            raise HTTPException(
                status_code=500, 
                detail=f"Error extracting text from PDF: {str(e)}"
            )
    
    @staticmethod
    async def extract_text_from_txt(file_content: bytes) -> str:
        """Extract text from text file."""
        try:
            text = file_content.decode('utf-8-sig')
            return text.strip()
        except UnicodeDecodeError:
            try:
                text = file_content.decode('latin-1')
                return text.strip()
            except Exception as e:
                logger.error(f"Error decoding text file: {describe_error(e)}")
                raise HTTPException(
                    status_code=500, 
                    detail=f"Error decoding text file. Please ensure it's properly encoded: {str(e)}"
                )
    
    @staticmethod
    async def extract_text_from_docx(file_content: bytes) -> str:
        """Extract text from DOCX file."""
        try:
            import io
            doc = docx.Document(io.BytesIO(file_content))
            text = ""
            
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting text from DOCX: {describe_error(e)}")
            raise HTTPException(
                status_code=500, 
                detail=f"Error extracting text from DOCX: {str(e)}"
            )

    @staticmethod
    async def segment_text_into_feedbacks(text: str) -> List[str]:
        """
        Use AI to break extracted text into individual feedback segments.
        
        Args:
            text: The extracted text content
            
        Returns:
            List of individual feedback text segments
        """
        try:
            logger.debug("Starting AI-based text segmentation...")
            
            # Use the prompt builder to generate the prompt
            formatted_prompt = prompt_builder.build_segmentation_prompt(text=text)

            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": prompt_builder.build_segmentation_system_message()},
                    {"role": "user", "content": formatted_prompt}
                ],
                temperature=0.1,
                max_tokens=4000            )
            
            response_text = response.choices[0].message.content
            if response_text:
                response_text = response_text.strip()
            
            logger.debug(f"Response length: {len(response_text) if response_text else 0}")
            
            # Check if response is empty or None
            if not response_text:
                logger.error("Empty response from AI segmentation")
                return [text]
            
            # Parse the JSON response; anything but a list of strings keeps the whole text
            try:
                feedback_segments = SegmentList.model_validate_json(strip_code_fence(response_text)).root
            except ValidationError as e:
                logger.error(f"AI segmentation reply failed validation, keeping whole text: {describe_validation_error(e)}")
                return [text]

            # Filter out empty or very short segments
            valid_segments = [segment.strip() for segment in feedback_segments
                            if segment.strip() and len(segment.strip()) > 10]

            if not valid_segments:
                logger.warning("No valid segments found, returning original text")
                return [text]

            logger.info(f"===================================\nSuccessfully segmented text into {len(valid_segments)} feedback items\n===================================")
            return valid_segments
                
        except Exception as e:
            logger.error(f"Error in AI text segmentation: {describe_error(e)}")
            return [text]  # Fallback to original text as single item

    @staticmethod
    async def extract_text(file: UploadFile) -> tuple[str, str]:
        """Extract text from uploaded file.
        
        Returns:
            tuple: (text_content, file_type)
        """
        await FileProcessor.validate_file(file)
        
        extension = FileProcessor.get_file_extension(file.filename)
        content = await file.read()
        
        if extension == '.pdf':
            text = await FileProcessor.extract_text_from_pdf(content)
            return text, 'pdf'
        elif extension == '.txt':
            text = await FileProcessor.extract_text_from_txt(content)
            return text, 'txt'
        elif extension == '.docx':
            text = await FileProcessor.extract_text_from_docx(content)
            return text, 'docx'
        else:            
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type: {extension}"
            )

    @staticmethod
    async def extract_and_segment_text(file: UploadFile) -> tuple[List[str], str]:
        """Extract text from uploaded file and segment into individual feedbacks.
        
        Returns:
            tuple: (list_of_feedback_texts, file_type)
        """
        # First extract the text normally
        text_content, file_type = await FileProcessor.extract_text(file)
        
        # Then segment it into individual feedbacks
        feedback_segments = await FileProcessor.segment_text_into_feedbacks(text_content)
        
        return feedback_segments, file_type

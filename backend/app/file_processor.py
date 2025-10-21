import os
import asyncio
import logging
from typing import Optional
from fastapi import UploadFile, HTTPException
import aiofiles
from PyPDF2 import PdfReader
import docx

logger = logging.getLogger(__name__)


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
            logger.error(f"Error extracting text from PDF: {str(e)}")
            raise HTTPException(
                status_code=500, 
                detail=f"Error extracting text from PDF: {str(e)}"
            )
    
    @staticmethod
    async def extract_text_from_txt(file_content: bytes) -> str:
        """Extract text from text file."""
        try:
            text = file_content.decode('utf-8')
            return text.strip()
        except UnicodeDecodeError:
            try:
                text = file_content.decode('latin-1')
                return text.strip()
            except Exception as e:
                logger.error(f"Error decoding text file: {str(e)}")
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
            logger.error(f"Error extracting text from DOCX: {str(e)}")
            raise HTTPException(
                status_code=500, 
                detail=f"Error extracting text from DOCX: {str(e)}"
            )
    
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

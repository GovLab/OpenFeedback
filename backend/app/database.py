from neo4j import GraphDatabase
from .config import settings
from .models import ClassifiedFeedback, GraphData, GraphNode, GraphRelationship
from typing import List
import uuid
import logging

logger = logging.getLogger(__name__)


class Neo4jDatabase:
    """Neo4j database handler for feedback storage and retrieval."""
    def __init__(self):
        """Initialize the database connection."""
        self.driver = None
        self._connection_error = None
        
        try:
            AWS_URI = settings.aws_neo4j_uri
            AWS_USER = settings.aws_neo4j_username
            AWS_PASSWORD = settings.aws_neo4j_password
            AWS_AUTH = (AWS_USER, AWS_PASSWORD)
            
            self.driver = GraphDatabase.driver(AWS_URI, auth=AWS_AUTH)
            self.driver.verify_connectivity()
            logger.info(f"✅ Successfully connected to Neo4j at {AWS_URI}")
        except Exception as e:
            self._connection_error = str(e)
            logger.error(f"❌ Failed to connect to Neo4j: {str(e)}")
            logger.warning("Server will continue to run, but Neo4j operations will fail")
            # Don't raise - allow server to start even if database is unavailable
    
    def close(self):
        """Close the database connection."""
        if hasattr(self, 'driver') and self.driver is not None:
            try:
                self.driver.close()
            except Exception as e:
                logger.error(f"Error closing Neo4j connection: {str(e)}")
    
    def add_feedback(self, feedback: ClassifiedFeedback, feedback_id: str = None) -> str:
        """
        Add classified feedback to the graph database.
        
        Args:
            feedback: ClassifiedFeedback object
            feedback_id: Optional UUID string to use (if None, will auto-generate)
            
        Returns:
            feedback_id: Unique identifier for the feedback
        """
        if self.driver is None:
            raise Exception(f"Neo4j database not connected: {self._connection_error}")
        
        if not feedback_id:
            feedback_id = str(uuid.uuid4())
        
        with self.driver.session() as session:
            # Create feedback node
            session.run(
                """
                CREATE (f:Feedback {
                    id: $id,
                    text: $text,
                    timestamp: datetime()
                })
                """,
                id=feedback_id,
                text=feedback.text,
                sentiment=feedback.sentiment,
            )
            
            # Create category nodes and relationships using the category_map
            # This ensures subcategories are linked only to their parent categories
            for category, subcategories in feedback.category_map.items():
                # Create category node and link to feedback
                session.run(
                    """
                    MERGE (c:Category {name: $category})
                    WITH c
                    MATCH (f:Feedback {id: $feedback_id})
                    MERGE (f)-[:BELONGS_TO]->(c)
                    """,
                    category=category,
                    feedback_id=feedback_id
                )
                
                # Create subcategory nodes and link them to their parent category
                for subcategory in subcategories:
                    session.run(
                        """
                        MERGE (s:Subcategory {name: $subcategory})
                        WITH s
                        MATCH (f:Feedback {id: $feedback_id})
                        MERGE (f)-[:TAGGED_AS]->(s)
                        WITH s
                        MATCH (c:Category {name: $category})
                        MERGE (s)-[:UNDER]->(c)
                        """,
                        subcategory=subcategory,
                        feedback_id=feedback_id,
                        category=category
                    )
        
        return feedback_id
    
    def get_graph_data(self) -> GraphData:
        """
        Retrieve all graph data for visualization.
        
        Returns:
            GraphData object containing nodes and relationships
        """
        if self.driver is None:
            raise Exception(f"Neo4j database not connected: {self._connection_error}")
        
        nodes = []
        relationships = []
        
        with self.driver.session() as session:
            # Get all nodes
            result = session.run(
                """
                MATCH (n)
                RETURN id(n) as id, labels(n) as labels, properties(n) as props
                """
            )
            
            for record in result:
                node_id = str(record["id"])
                labels = record["labels"]
                props = record["props"]
                
                # Create node with all available properties from Neo4j
                node_data = {
                    "id": node_id,
                    "type": labels[0] if labels else "Unknown"
                }
                
                # Add type-specific properties
                if "Feedback" in labels:
                    node_data["text"] = props.get("text")
                    node_data["sentiment"] = props.get("sentiment")
                    # Convert Neo4j DateTime to ISO string if present
                    if "timestamp" in props and props["timestamp"]:
                        try:
                            node_data["timestamp"] = props["timestamp"].isoformat()
                        except:
                            node_data["timestamp"] = str(props["timestamp"])
                else:
                    # For Category and Subcategory nodes
                    node_data["name"] = props.get("name")
                
                nodes.append(GraphNode(**node_data))
            
            # Get all relationships
            result = session.run(
                """
                MATCH (a)-[r]->(b)
                RETURN id(a) as source, id(b) as target, type(r) as type
                """
            )
            
            for record in result:
                relationships.append(GraphRelationship(
                    source=str(record["source"]),
                    target=str(record["target"]),
                    type=record["type"]
                ))
        
        return GraphData(nodes=nodes, relationships=relationships)
    
    def get_feedback_count(self) -> int:
        """Get total number of feedback entries."""
        if self.driver is None:
            raise Exception(f"Neo4j database not connected: {self._connection_error}")
        
        with self.driver.session() as session:
            result = session.run("MATCH (f:Feedback) RETURN count(f) as count")
            record = result.single()
            return record["count"] if record else 0
    
    def get_categories_summary(self) -> List[dict]:
        """Get summary of categories with feedback counts."""
        if self.driver is None:
            raise Exception(f"Neo4j database not connected: {self._connection_error}")
        
        with self.driver.session() as session:
            result = session.run(
                """
                MATCH (c:Category)<-[:BELONGS_TO]-(f:Feedback)
                RETURN c.name as category, count(f) as count
                ORDER BY count DESC
                """
            )
            return [{"category": record["category"], "count": record["count"]} 
                    for record in result]


# Global database instance
db = Neo4jDatabase()
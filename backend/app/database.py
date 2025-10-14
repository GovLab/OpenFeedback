from neo4j import GraphDatabase
from app.config import settings
from app.models import ClassifiedFeedback, GraphData, GraphNode, GraphRelationship
from typing import List
import uuid


class Neo4jDatabase:
    """Neo4j database handler for feedback storage and retrieval."""
    
    def __init__(self):
        self.driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password)
        )
    
    def close(self):
        """Close the database connection."""
        self.driver.close()
    
    def add_feedback(self, feedback: ClassifiedFeedback) -> str:
        """
        Add classified feedback to the graph database.
        
        Args:
            feedback: ClassifiedFeedback object
            
        Returns:
            feedback_id: Unique identifier for the feedback
        """
        feedback_id = str(uuid.uuid4())
        
        with self.driver.session() as session:
            # Create feedback node
            session.run(
                """
                CREATE (f:Feedback {
                    id: $id,
                    text: $text,
                    sentiment: $sentiment,
                    timestamp: datetime()
                })
                """,
                id=feedback_id,
                text=feedback.text,
                sentiment=feedback.sentiment
            )
            
            # Create category nodes and relationships
            for category in feedback.categories:
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
            
            # Create subcategory nodes and relationships
            for subcategory in feedback.subcategories:
                session.run(
                    """
                    MERGE (s:Subcategory {name: $subcategory})
                    WITH s
                    MATCH (f:Feedback {id: $feedback_id})
                    MERGE (f)-[:TAGGED_AS]->(s)
                    """,
                    subcategory=subcategory,
                    feedback_id=feedback_id
                )
                
                # Link subcategories to their parent categories if applicable
                for category in feedback.categories:
                    session.run(
                        """
                        MATCH (c:Category {name: $category})
                        MATCH (s:Subcategory {name: $subcategory})
                        MERGE (s)-[:UNDER]->(c)
                        """,
                        category=category,
                        subcategory=subcategory
                    )
        
        return feedback_id
    
    def get_graph_data(self) -> GraphData:
        """
        Retrieve all graph data for visualization.
        
        Returns:
            GraphData object containing nodes and relationships
        """
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
                
                # Determine label for display
                if "Feedback" in labels:
                    label = props.get("text", "")[:50] + "..." if len(props.get("text", "")) > 50 else props.get("text", "Feedback")
                else:
                    label = props.get("name", "Unknown")
                
                nodes.append(GraphNode(
                    id=node_id,
                    label=label,
                    type=labels[0] if labels else "Unknown"
                ))
            
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
        with self.driver.session() as session:
            result = session.run("MATCH (f:Feedback) RETURN count(f) as count")
            record = result.single()
            return record["count"] if record else 0
    
    def get_categories_summary(self) -> List[dict]:
        """Get summary of categories with feedback counts."""
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

"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { GraphData } from "@/lib/api";

interface GraphVisualizationProps {
  data: GraphData;
}

interface EnhancedNode {
  id: string;
  name: string;
  type: string;
  color: string;
  size: number;
  feedbackCount: number;
  x?: number;
  y?: number;
}

// ================ Empty State Component ================
function GraphEmptyState() {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl shadow-sm p-8 text-center border border-slate-200">
      <div className="text-slate-400 mb-2">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <p className="text-slate-600 text-lg font-medium">
        No feedback data yet
      </p>
      <p className="text-slate-500 text-sm mt-1">
        Submit your first feedback to visualize the graph
      </p>
    </div>
  );
}

// ================ Legend Component ================
interface GraphLegendProps {
  zoomLevel: number;
}

function GraphLegend({ zoomLevel }: GraphLegendProps) {
  return (
    <div className="mb-3 md:mb-4 flex flex-wrap gap-2 md:gap-3 bg-white rounded-lg p-2 md:p-3 lg:p-4 border border-slate-200 overflow-x-auto">
      <div className="flex items-center gap-2 px-2 md:px-3 py-1.5 bg-blue-50 rounded-lg flex-shrink-0">
        <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-blue-500 shadow-sm"></div>
        <span className="text-slate-700 text-xs md:text-sm font-medium whitespace-nowrap">Feedback</span>
      </div>
      <div className="flex items-center gap-2 px-2 md:px-3 py-1.5 bg-green-50 rounded-lg flex-shrink-0">
        <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-500 shadow-sm"></div>
        <span className="text-slate-700 text-xs md:text-sm font-medium whitespace-nowrap">Category</span>
      </div>
      <div className="flex items-center gap-2 px-2 md:px-3 py-1.5 bg-amber-50 rounded-lg flex-shrink-0">
        <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-amber-500 shadow-sm"></div>
        <span className="text-slate-700 text-xs md:text-sm font-medium whitespace-nowrap">Subcategory</span>
      </div>
      <div className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 flex-shrink-0">
        <svg className="w-3 h-3 md:w-3.5 md:h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-slate-600 text-xs whitespace-nowrap">Zoom: {zoomLevel.toFixed(1)}x</span>
      </div>
    </div>
  );
}

// ================ Node Details Sidebar Component ================
interface NodeDetailsSidebarProps {
  selectedNode: any;
  onClose: () => void;
  getNodeInfo: (node: any) => any;
}

function NodeDetailsSidebar({ selectedNode, onClose, getNodeInfo }: NodeDetailsSidebarProps) {
  const nodeInfo = getNodeInfo(selectedNode);

  return (
    <div className="w-80 bg-white rounded-xl p-4 md:p-6 border border-slate-200 shadow-lg flex flex-col h-full overflow-hidden flex-shrink-0">
      <div className="flex items-start justify-between mb-4 md:mb-6">
        <div>
          <h3 className="text-lg md:text-xl font-bold text-slate-900">Node Details</h3>
          <p className="text-xs text-slate-500 mt-1">Selected node information</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-3 md:space-y-4 flex-1 overflow-y-auto min-h-0">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 md:p-4 border border-slate-200">
          <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide">Name</p>
          <p className="text-base md:text-lg font-bold text-slate-900 mt-1 break-words">{selectedNode.name}</p>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 md:p-4 border border-slate-200">
          <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide">Type</p>
          <div className="flex items-center gap-2 mt-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: selectedNode.color }}
            ></div>
            <p className="text-base md:text-lg font-bold text-slate-900">{selectedNode.type}</p>
          </div>
        </div>

        {(selectedNode.type === "Category" || selectedNode.type === "Subcategory") && (
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 md:p-4 border border-blue-200">
            <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Total Feedback</p>
            <p className="text-xl md:text-2xl font-bold text-blue-900 mt-1">
              {nodeInfo.feedbackCount || 0}
            </p>
          </div>
        )}

        {selectedNode.type === "Category" && (
          <>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 md:p-4 border border-green-200">
              <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">Total Subcategories</p>
              <p className="text-xl md:text-2xl font-bold text-green-900 mt-1">
                {nodeInfo.totalSubcategories}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-2 md:mb-3">Feedback by Subcategory</p>
              <div className="space-y-1.5 md:space-y-2 bg-slate-50 rounded-lg p-2 md:p-3 border border-slate-200 max-h-48 md:max-h-64 overflow-y-auto">
                {Object.entries(nodeInfo.feedbackBySubcategory || {}).length > 0 ? (
                  Object.entries(nodeInfo.feedbackBySubcategory || {})
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([subcat, count]: [string, unknown]) => (
                      <div key={subcat} className="flex items-center justify-between py-2 px-3 hover:bg-white rounded-lg transition-colors">
                        <p className="text-sm text-slate-700 font-medium truncate flex-1 mr-2">{subcat}</p>
                        <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 text-xs font-bold text-white bg-blue-500 rounded-full flex-shrink-0">
                          {count as number}
                        </span>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-slate-500 py-2 text-center">No subcategories</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <button
        onClick={onClose}
        className="mt-4 md:mt-6 w-full px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors text-sm shadow-sm"
      >
        Close
      </button>
    </div>
  );
}

// ================ Main Component ================
export default function GraphVisualization({ data }: GraphVisualizationProps) {
  const graphRef = useRef<any>(null);
  const [ForceGraph2D, setForceGraph2D] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [highlightedLinks, setHighlightedLinks] = useState<Set<string>>(new Set());

  // Dynamically import ForceGraph2D on client side
  useEffect(() => {
    import("react-force-graph-2d").then((mod) =>
      setForceGraph2D(() => mod.default)
    );
  }, []);

  // Calculate feedback counts for each node
  const feedbackCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    
    data.nodes.forEach((node) => {
      if (node.type === "Feedback") {
        counts[node.id] = 1;
      } else if (node.type === "Subcategory") {
        // Count direct feedback connections to this subcategory
        const feedbackCount = data.relationships.filter(
          (rel) => rel.target === node.id && 
          data.nodes.find(n => n.id === rel.source && n.type === "Feedback")
        ).length;
        counts[node.id] = feedbackCount;
      } else if (node.type === "Category") {
        // Find all subcategories belonging to this category
        const subcategoryIds = data.relationships
          .filter((rel) => rel.target === node.id && 
            data.nodes.find(n => n.id === rel.source && n.type === "Subcategory"))
          .map((rel) => rel.source);
        
        // Collect unique feedback IDs connected to any of these subcategories
        const uniqueFeedbackIds = new Set<string>();
        subcategoryIds.forEach((subcatId) => {
          data.relationships
            .filter((rel) => rel.target === subcatId && 
              data.nodes.find(n => n.id === rel.source && n.type === "Feedback"))
            .forEach((rel) => uniqueFeedbackIds.add(rel.source));
        });
        
        counts[node.id] = uniqueFeedbackIds.size;
      }
    });
    
    return counts;
  }, [data]);

  // Calculate dynamic node sizes
  const getNodeSize = useCallback((node: EnhancedNode): number => {
    const feedbackCount = node.feedbackCount || 0;
    
    if (node.type === "Feedback") {
      return 7; // Increased from 4 to 7
    } else if (node.type === "Subcategory") {
      // Base size 12, scale with feedback count (max ~28)
      return Math.min(12 + feedbackCount * 1.2, 28);
    } else if (node.type === "Category") {
      // 1.5x subcategory size
      const subcatSize = Math.min(12 + feedbackCount * 1.2, 28);
      return subcatSize * 1.5;
    }
    return 8;
  }, []);

  // Transform data to force-graph format with enhanced properties and circular positioning
  const graphData = useMemo(() => {
    // Group nodes by type
    const categoryNodes = data.nodes.filter(n => n.type === "Category");
    const subcategoryNodes = data.nodes.filter(n => n.type === "Subcategory");
    const feedbackNodes = data.nodes.filter(n => n.type === "Feedback");
    
    // Arrange nodes in circles
    const arrangeInCircle = (nodes: any[], radius: number, startIndex: number) => {
      return nodes.map((node, index) => {
        const angle = (2 * Math.PI * (startIndex + index)) / Math.max(nodes.length, 1);
        return {
      id: node.id,
      name: node.label,
      type: node.type,
      color: getNodeColor(node.type),
          feedbackCount: feedbackCounts[node.id] || 0,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        };
      });
    };
    
    // Position nodes in their respective circles
    const categoryCircle = arrangeInCircle(categoryNodes, 300, 0);
    const subcategoryCircle = arrangeInCircle(subcategoryNodes, 180, 0);
    const feedbackCircle = arrangeInCircle(feedbackNodes, 60, 0);
    
    // Filter relationships to exclude direct connections between Feedback and Category
    const filteredRelationships = data.relationships.filter((rel) => {
      const sourceNode = data.nodes.find(n => n.id === rel.source);
      const targetNode = data.nodes.find(n => n.id === rel.target);
      
      // Exclude direct Feedback -> Category connections
      if (sourceNode?.type === "Feedback" && targetNode?.type === "Category") {
        return false;
      }
      // Exclude direct Category -> Feedback connections
      if (sourceNode?.type === "Category" && targetNode?.type === "Feedback") {
        return false;
      }
      
      return true;
    });
    
    return {
      nodes: [...categoryCircle, ...subcategoryCircle, ...feedbackCircle],
    links: filteredRelationships.map((rel) => ({
      source: rel.source,
      target: rel.target,
      label: rel.type,
    })),
  };
  }, [data, feedbackCounts]);

  // Calculate highlighted nodes and links based on selected node
  const getConnectedNodesAndLinks = useCallback((node: any) => {
    if (!node) return { nodes: new Set<string>(), links: new Set<string>() };

    const connectedNodes = new Set<string>();
    const connectedLinks = new Set<string>();
    
    // Always include the selected node itself
    connectedNodes.add(node.id);

    if (node.type === "Category") {
      // For Category: highlight all subcategories that belong to it
      data.relationships.forEach((rel) => {
        const sourceNode = data.nodes.find(n => n.id === rel.source);
        const targetNode = data.nodes.find(n => n.id === rel.target);
        
        // Subcategory -> Category relationship
        if (rel.target === node.id && sourceNode?.type === "Subcategory") {
          connectedNodes.add(rel.source);
          connectedLinks.add(`${rel.source}-${rel.target}`);
          
          // Now find all feedback connected to this subcategory
          data.relationships.forEach((feedbackRel) => {
            const feedbackSource = data.nodes.find(n => n.id === feedbackRel.source);
            // Feedback -> Subcategory relationship
            if (feedbackRel.target === rel.source && feedbackSource?.type === "Feedback") {
              connectedNodes.add(feedbackRel.source);
              connectedLinks.add(`${feedbackRel.source}-${feedbackRel.target}`);
            }
          });
        }
      });
    } else if (node.type === "Subcategory") {
      // For Subcategory: highlight the category it belongs to and all feedback connected to it
      data.relationships.forEach((rel) => {
        const sourceNode = data.nodes.find(n => n.id === rel.source);
        const targetNode = data.nodes.find(n => n.id === rel.target);
        
        // Subcategory -> Category relationship
        if (rel.source === node.id && targetNode?.type === "Category") {
          connectedNodes.add(rel.target);
          connectedLinks.add(`${rel.source}-${rel.target}`);
        }
        
        // Feedback -> Subcategory relationship
        if (rel.target === node.id && sourceNode?.type === "Feedback") {
          connectedNodes.add(rel.source);
          connectedLinks.add(`${rel.source}-${rel.target}`);
        }
      });
    } else if (node.type === "Feedback") {
      // For Feedback: highlight all subcategories it's connected to and their categories
      data.relationships.forEach((rel) => {
        const targetNode = data.nodes.find(n => n.id === rel.target);
        
        // Feedback -> Subcategory relationship
        if (rel.source === node.id && targetNode?.type === "Subcategory") {
          connectedNodes.add(rel.target);
          connectedLinks.add(`${rel.source}-${rel.target}`);
          
          // Now find the category this subcategory belongs to
          data.relationships.forEach((catRel) => {
            const catTarget = data.nodes.find(n => n.id === catRel.target);
            // Subcategory -> Category relationship
            if (catRel.source === rel.target && catTarget?.type === "Category") {
              connectedNodes.add(catRel.target);
              connectedLinks.add(`${catRel.source}-${catRel.target}`);
            }
          });
        }
      });
    }

    return { nodes: connectedNodes, links: connectedLinks };
  }, [data]);

  // Update highlighted nodes and links when selected node changes
  useEffect(() => {
    if (selectedNode) {
      const { nodes, links } = getConnectedNodesAndLinks(selectedNode);
      setHighlightedNodes(nodes);
      setHighlightedLinks(links);
    } else {
      setHighlightedNodes(new Set());
      setHighlightedLinks(new Set());
    }
  }, [selectedNode, getConnectedNodesAndLinks]);

  function getNodeColor(type: string): string {
    const colors: { [key: string]: string } = {
      Feedback: "#3b82f6", // blue
      Category: "#10b981", // green
      Subcategory: "#f59e0b", // amber
      Unknown: "#6b7280", // gray
    };
    return colors[type] || colors.Unknown;
  }

  function getNodeColorLight(type: string): string {
    const colors: { [key: string]: string } = {
      Feedback: "#93c5fd", // blue-300
      Category: "#6ee7b7", // green-300
      Subcategory: "#fcd34d", // amber-300
      Unknown: "#9ca3af", // gray-400
    };
    return colors[type] || colors.Unknown;
  }

  function truncateLabel(label: string, maxLength: number = 25): string {
    if (label.length <= maxLength) return label;
    // Smart truncation - keep first few words
    const words = label.split(" ");
    if (words.length <= 3) {
      return label.substring(0, maxLength - 3) + "...";
    }
    
    let truncated = "";
    for (let i = 0; i < words.length; i++) {
      if ((truncated + words[i]).length > maxLength - 3) break;
      truncated += (truncated ? " " : "") + words[i];
    }
    return truncated + "...";
  }

  function getNodeInfo(node: any) {
    if (node.type === "Category") {
      // Find subcategories that belong to this category
      // Structure: Subcategory (source) -> belongs_to -> Category (target)
      const subcategories = data.nodes.filter(
        (n) =>
          n.type === "Subcategory" &&
          data.relationships.some(
            (rel) => rel.target === node.id && rel.source === n.id
          )
      );

      // Count feedback for each subcategory
      const feedbackCounts: { [key: string]: number } = {};
      const uniqueFeedbackIds = new Set<string>();
      
      subcategories.forEach((subcat) => {
        // Find feedback nodes that belong to this subcategory
        // Structure: Feedback (source) -> belongs_to -> Subcategory (target)
        const feedbackForSubcat = data.relationships.filter(
          (rel) => 
            rel.target === subcat.id && 
            data.nodes.find(n => n.id === rel.source && n.type === "Feedback")
        );
        
        feedbackCounts[subcat.label] = feedbackForSubcat.length;
        
        // Track unique feedback IDs across all subcategories
        feedbackForSubcat.forEach((rel) => uniqueFeedbackIds.add(rel.source));
      });

      return {
        name: node.name,
        type: node.type,
        feedbackCount: uniqueFeedbackIds.size, // Count unique feedback only
        totalSubcategories: subcategories.length,
        feedbackBySubcategory: feedbackCounts,
      };
    }

    if (node.type === "Subcategory") {
      // Count direct feedback for this subcategory
      const feedbackCount = data.relationships.filter(
        (rel) => 
          rel.target === node.id && 
          data.nodes.find(n => n.id === rel.source && n.type === "Feedback")
      ).length;
      
      return {
        name: node.name,
        type: node.type,
        feedbackCount: feedbackCount,
      };
    }

    return {
      name: node.name,
      type: node.type,
      feedbackCount: node.feedbackCount || 0,
    };
  }

  // Configure physics for circular radial layout
  useEffect(() => {
    if (graphRef.current && ForceGraph2D) {
      // Weaker charge for circular layout
      graphRef.current.d3Force("charge")
        .strength(-100)
        .distanceMax(200);
      
      // Flexible link distances
      graphRef.current.d3Force("link")
        .distance((link: any) => {
          const sourceNode = graphData.nodes.find(n => n.id === link.source.id || n.id === link.source);
          const targetNode = graphData.nodes.find(n => n.id === link.target.id || n.id === link.target);
          
          // Radial connections from center to outer circles
          if (sourceNode?.type === "Feedback" && targetNode?.type === "Subcategory") return 180;
          if (sourceNode?.type === "Subcategory" && targetNode?.type === "Category") return 200;
          if (sourceNode?.type === "Category") return 150;
          return 100;
        })
        .strength(0.4);
      
      // No center force - we'll use radial positioning
      graphRef.current.d3Force("center", null);
      
      // Add radial positioning force
      const radialForce = (alpha: number) => {
        const centerX = 0;
        const centerY = 0;
        
        graphData.nodes.forEach((node: any) => {
          if (!node.x || !node.y || !isFinite(node.x) || !isFinite(node.y)) return;
          
          // Define radius for each node type
          let targetRadius = 0;
          if (node.type === "Category") {
            targetRadius = 300; // Outer circle
          } else if (node.type === "Subcategory") {
            targetRadius = 180; // Middle circle
          } else if (node.type === "Feedback") {
            targetRadius = 60; // Inner circle/center
          }
          
          // Calculate current distance from center
          const dx = node.x - centerX;
          const dy = node.y - centerY;
          const currentRadius = Math.sqrt(dx * dx + dy * dy);
          
          if (currentRadius > 0) {
            // Push node towards target radius
            const targetX = centerX + (dx / currentRadius) * targetRadius;
            const targetY = centerY + (dy / currentRadius) * targetRadius;
            
            // Apply force with strength based on alpha
            const strength = alpha * 0.8;
            node.x += (targetX - node.x) * strength;
            node.y += (targetY - node.y) * strength;
          }
        });
      };
      
      graphRef.current.d3Force("radial", radialForce);

      // Add collision force optimized for circular layout
      const collisionForce = (alpha: number) => {
        const nodes = graphData.nodes;
        const iterations = 3;
        
        for (let iter = 0; iter < iterations; iter++) {
          for (let i = 0; i < nodes.length; i++) {
            const nodeA = nodes[i] as any;
            if (!nodeA.x || !nodeA.y || !isFinite(nodeA.x) || !isFinite(nodeA.y)) continue;
            
            const enhancedA = graphData.nodes.find(n => n.id === nodeA.id) as EnhancedNode;
            const sizeA = enhancedA ? getNodeSize(enhancedA) : 10;
            // Larger padding for circular layout with labels
            const paddingA = nodeA.type === "Category" ? 55 : nodeA.type === "Subcategory" ? 45 : 30;
            const radiusA = sizeA + paddingA;
            
            for (let j = i + 1; j < nodes.length; j++) {
              const nodeB = nodes[j] as any;
              if (!nodeB.x || !nodeB.y || !isFinite(nodeB.x) || !isFinite(nodeB.y)) continue;
              
              const enhancedB = graphData.nodes.find(n => n.id === nodeB.id) as EnhancedNode;
              const sizeB = enhancedB ? getNodeSize(enhancedB) : 10;
              const paddingB = nodeB.type === "Category" ? 55 : nodeB.type === "Subcategory" ? 45 : 30;
              const radiusB = sizeB + paddingB;
              
              const dx = nodeB.x - nodeA.x;
              const dy = nodeB.y - nodeA.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const minDistance = radiusA + radiusB;
              
              if (distance < minDistance && distance > 0) {
                // Push nodes apart along the circle (tangentially)
                const overlap = minDistance - distance;
                const strength = (overlap / minDistance) * alpha * 0.9;
                const moveDistance = overlap * 0.5 + strength;
                const moveX = (dx / distance) * moveDistance;
                const moveY = (dy / distance) * moveDistance;
                
                nodeB.x! += moveX;
                nodeB.y! += moveY;
                nodeA.x! -= moveX;
                nodeA.y! -= moveY;
                
                // Dampening
                if (nodeB.vx !== undefined) nodeB.vx *= 0.85;
                if (nodeB.vy !== undefined) nodeB.vy *= 0.85;
                if (nodeA.vx !== undefined) nodeA.vx *= 0.85;
                if (nodeA.vy !== undefined) nodeA.vy *= 0.85;
              }
            }
          }
        }
      };
      
      graphRef.current.d3Force("collide", collisionForce);
    }
  }, [ForceGraph2D, graphData, getNodeSize]);

  // Auto-fit graph on data change
  useEffect(() => {
    if (graphRef.current && data.nodes.length > 0) {
      setTimeout(() => {
        graphRef.current.zoomToFit(300, 100); // Padding to show circular layout clearly
      }, 600); // Circular layout converges faster
    }
  }, [data.nodes.length]);

  // Render canvas node
  const renderNode = useCallback((
    node: any,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => {
    // Safety check: ensure node has valid coordinates
    if (!node.x || !node.y || !isFinite(node.x) || !isFinite(node.y)) {
      return;
    }

    const enhancedNode = graphData.nodes.find(n => n.id === node.id) as EnhancedNode;
    const size = getNodeSize({ ...node, ...enhancedNode });
    const isSelected = selectedNode?.id === node.id;
    const isHovered = hoveredNode?.id === node.id;
    const isHighlighted = highlightedNodes.has(node.id);
    const hasSelection = selectedNode !== null;
    
    // If there's a selection and this node is not highlighted, fade it out
    const shouldFade = hasSelection && !isHighlighted;
    const nodeOpacity = shouldFade ? 0.15 : 1;
    
    // Apply opacity for faded nodes
    ctx.globalAlpha = nodeOpacity;
    
    // Draw outer glow for selected/hovered nodes (and highlighted nodes)
    if ((isSelected || isHovered) || (isHighlighted && hasSelection && !isSelected)) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size + 6, 0, 2 * Math.PI, false);
      ctx.fillStyle = getNodeColorLight(node.type);
      ctx.globalAlpha = nodeOpacity * 0.3;
      ctx.fill();
      ctx.globalAlpha = nodeOpacity;
    }

    // Draw node circle with gradient effect
    const gradient = ctx.createRadialGradient(
      node.x - size * 0.3,
      node.y - size * 0.3,
      0,
      node.x,
      node.y,
      size
    );
    gradient.addColorStop(0, getNodeColorLight(node.type));
    gradient.addColorStop(1, node.color);

                ctx.beginPath();
                ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    ctx.fillStyle = gradient;
                ctx.fill();

    // Draw border
    ctx.strokeStyle = isSelected ? "#1e293b" : "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = (isSelected ? 3 : 2) / globalScale;
    ctx.stroke();

    // Draw feedback count badge for category and subcategory nodes
    if ((node.type === "Category" || node.type === "Subcategory") && enhancedNode?.feedbackCount > 0) {
      const badgeSize = size * 0.6;
      const badgeX = node.x + size * 0.6;
      const badgeY = node.y - size * 0.6;
      
      // Badge background
                  ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeSize, 0, 2 * Math.PI, false);
      ctx.fillStyle = "#1e293b";
      ctx.fill();
      
      // Badge border
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2 / globalScale;
                  ctx.stroke();
      
      // Badge text
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${(badgeSize * 1.3) / globalScale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(enhancedNode.feedbackCount.toString(), badgeX, badgeY);
    }

    // Label rendering logic based on zoom level and node type
    const shouldShowLabel = 
      isSelected || 
      (globalScale > 1.0 && (node.type === "Category" || node.type === "Subcategory")) ||
      (globalScale > 1.8);

                if (shouldShowLabel) {
      const label = truncateLabel(node.name, globalScale > 1.5 ? 35 : 20);
      const fontSize = Math.max(10, 14 / globalScale);
      ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
      
      const textWidth = ctx.measureText(label).width;
      const padding = fontSize * 0.6;
      const bckgWidth = textWidth + padding * 2;
      const bckgHeight = fontSize + padding * 1.2;
      
      const labelY = node.y + size + bckgHeight / 2 + 8;

      // Draw label background with shadow and transparency
                  ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
      ctx.shadowBlur = 6 / globalScale;
                  ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2 / globalScale;
      
      ctx.fillStyle = isSelected || isHovered 
        ? "rgba(30, 41, 59, 0.85)" 
        : "rgba(255, 255, 255, 0.75)"; // More transparent
      ctx.beginPath();
      ctx.roundRect(
        node.x - bckgWidth / 2,
        labelY - bckgHeight / 2,
        bckgWidth,
        bckgHeight,
        4 / globalScale
      );
      ctx.fill();

      // Optional: border for non-selected labels with transparency
      if (!isSelected && !isHovered) {
        ctx.strokeStyle = "rgba(203, 213, 225, 0.5)"; // More transparent border
        ctx.lineWidth = 1 / globalScale;
        ctx.stroke();
      }

                  ctx.shadowColor = "transparent";

      // Draw label text with slight transparency
                  ctx.textAlign = "center";
                  ctx.textBaseline = "middle";
      ctx.fillStyle = isSelected || isHovered ? "rgba(255, 255, 255, 0.95)" : "rgba(30, 41, 59, 0.85)";
      ctx.fillText(label, node.x, labelY);
    }
    
    // Reset global alpha
    ctx.globalAlpha = 1;
  }, [graphData.nodes, getNodeSize, selectedNode, hoveredNode, highlightedNodes]);

  if (data.nodes.length === 0) {
    return <GraphEmptyState />;
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-xl shadow-sm p-4 md:p-8">
          <div className="mb-3 md:mb-4">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 mb-1 md:mb-2">Feedback Graph</h2>
            <p className="text-slate-600 text-xs md:text-sm">Circular visualization with Categories (outer), Subcategories (middle), and Feedback (center)</p>
            <p className="text-slate-500 text-xs mt-1 hidden md:block">
              Node sizes represent feedback volume • Click nodes to highlight connections • Drag to pan • Scroll to zoom
            </p>
          </div>

      <div className="flex gap-4 lg:gap-6 h-[400px] md:h-[500px] lg:h-[600px]">
        <div className="flex-1 flex flex-col min-w-0">
          <GraphLegend zoomLevel={zoomLevel} />

          <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden bg-gradient-to-br from-slate-50 to-white shadow-inner min-h-0 relative">
            {/* Reset View Button */}
            <button
              onClick={() => {
                if (graphRef.current) {
                  graphRef.current.zoomToFit(100,100);
                }
              }}
              className="absolute top-3 right-3 z-10 p-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg group"
              title="Reset to default view"
            >
              <svg 
                className="w-4 h-4 text-slate-600 group-hover:text-slate-900 transition-colors" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            </button>

            {ForceGraph2D && (
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeLabel={(node: any) => `${node.name} (${node.feedbackCount || 0} feedback)`}
                nodeColor="color"
                linkLabel="label"
                linkDirectionalArrowLength={8}
                linkDirectionalArrowRelPos={0.9}
                linkDirectionalArrowColor={(link: any) => {
                  if (!selectedNode) return "#94a3b8";
                  const linkId = `${link.source.id || link.source}-${link.target.id || link.target}`;
                  const isHighlighted = highlightedLinks.has(linkId);
                  return isHighlighted ? "#2563eb" : "#cbd5e1";
                }}
                linkColor={(link: any) => {
                  if (!selectedNode) return "#cbd5e1";
                  const linkId = `${link.source.id || link.source}-${link.target.id || link.target}`;
                  const isHighlighted = highlightedLinks.has(linkId);
                  return isHighlighted ? "#3b82f6" : "#e2e8f0";
                }}
                linkWidth={(link: any) => {
                  if (!selectedNode) return 2;
                  const linkId = `${link.source.id || link.source}-${link.target.id || link.target}`;
                  const isHighlighted = highlightedLinks.has(linkId);
                  return isHighlighted ? 3 : 1;
                }}
                linkOpacity={(link: any) => {
                  if (!selectedNode) return 0.4;
                  const linkId = `${link.source.id || link.source}-${link.target.id || link.target}`;
                  const isHighlighted = highlightedLinks.has(linkId);
                  return isHighlighted ? 0.8 : 0.1;
                }}
                linkDirectionalParticles={(link: any) => {
                  if (!selectedNode) return 2;
                  const linkId = `${link.source.id || link.source}-${link.target.id || link.target}`;
                  const isHighlighted = highlightedLinks.has(linkId);
                  return isHighlighted ? 4 : 0;
                }}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleSpeed={0.003}
                onNodeClick={(node: any) => setSelectedNode(node)}
                onNodeHover={(node: any) => setHoveredNode(node)}
                onZoom={(transform: any) => {
                  setZoomLevel(transform.k);
                }}
                nodeCanvasObject={renderNode}
                cooldownTicks={200}
                d3VelocityDecay={0.4}
                d3AlphaDecay={0.02}
                warmupTicks={50}
                enableNodeDrag={true}
                enableZoomInteraction={true}
                enablePanInteraction={true}
              />
            )}
          </div>
        </div>

        {selectedNode && (
          <NodeDetailsSidebar
            selectedNode={selectedNode}
            onClose={() => setSelectedNode(null)}
            getNodeInfo={getNodeInfo}
          />
        )}
      </div>
    </div>
  );
}

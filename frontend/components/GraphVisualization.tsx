'use client';

import { useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { GraphData } from '@/lib/api';

interface GraphVisualizationProps {
  data: GraphData;
}

export default function GraphVisualization({ data }: GraphVisualizationProps) {
  const graphRef = useRef<any>();

  // Transform data to force-graph format
  const graphData = {
    nodes: data.nodes.map(node => ({
      id: node.id,
      name: node.label,
      type: node.type,
      color: getNodeColor(node.type)
    })),
    links: data.relationships.map(rel => ({
      source: rel.source,
      target: rel.target,
      label: rel.type
    }))
  };

  function getNodeColor(type: string): string {
    const colors: { [key: string]: string } = {
      Feedback: '#3b82f6',      // blue
      Category: '#10b981',      // green
      Subcategory: '#f59e0b',   // amber
      Unknown: '#6b7280'        // gray
    };
    return colors[type] || colors.Unknown;
  }

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.d3Force('charge').strength(-200);
      graphRef.current.d3Force('link').distance(100);
    }
  }, []);

  if (data.nodes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <p className="text-gray-600">No feedback data to display yet. Submit some feedback to see the graph!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Feedback Graph</h2>
      
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
          <span className="text-gray-700">Feedback</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500"></div>
          <span className="text-gray-700">Category</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-amber-500"></div>
          <span className="text-gray-700">Subcategory</span>
        </div>
      </div>

      <div className="border border-gray-300 rounded-md overflow-hidden">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeLabel="name"
          nodeColor="color"
          linkLabel="label"
          linkDirectionalArrowLength={6}
          linkDirectionalArrowRelPos={1}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.name;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.4);

            // Draw node circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.color;
            ctx.fill();

            // Draw label background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(
              node.x - bckgDimensions[0] / 2,
              node.y - bckgDimensions[1] / 2 + 8,
              bckgDimensions[0],
              bckgDimensions[1]
            );

            // Draw label text
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#333';
            ctx.fillText(label, node.x, node.y + 8);
          }}
          width={800}
          height={600}
        />
      </div>
    </div>
  );
}

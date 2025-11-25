'use client';

import { NodeProps, Handle, Position } from '@xyflow/react';

export function CompartmentNode({ data }: NodeProps) {
  const label = (data as { label?: string }).label || '';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
      title={label}
    >
      <Handle type="target" position={Position.Top} id="top" isConnectable={false} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} id="top-source" isConnectable={false} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="bottom" isConnectable={false} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" isConnectable={false} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left" isConnectable={false} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} id="left-source" isConnectable={false} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} id="right" isConnectable={false} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right-source" isConnectable={false} style={{ opacity: 0 }} />
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
} from 'reactflow';
import { Card, Badge, Typography, Tooltip, Space, Statistic, Modal, Descriptions, Tag } from 'antd';
import { 
  PlayCircleOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  FireOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';

import 'reactflow/dist/style.css';
import './OperatorDAG.css';

const { Text } = Typography;

// 自定义操作符节点组件
const OperatorNode = ({ data, isConnectable }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'enabled':
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'running':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'pending':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'enabled':
      case 'completed':
        return '#f6ffed';
      case 'running':
        return '#e6f7ff';
      case 'pending':
        return '#fffbf0';
      case 'error':
        return '#fff2f0';
      default:
        return '#f5f5f5';
    }
  };

  const getBorderColor = (status) => {
    switch (status) {
      case 'enabled':
      case 'completed':
        return '#b7eb8f';
      case 'running':
        return '#91d5ff';
      case 'pending':
        return '#ffd666';
      case 'error':
        return '#ffa39e';
      default:
        return '#d9d9d9';
    }
  };

  return (
    <div>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555' }}
        isConnectable={isConnectable}
      />
      
      <Tooltip
        title={
          <div>
            <div><strong>{data.name}</strong></div>
            <div>type: {data.type}</div>
            <div>model: {data.model}</div>
            <div>status: {data.status}</div>
            {data.executionTime && (
              <div>time: {data.executionTime}ms</div>
            )}
            {data.tokenUsage && (
              <div>Token: {data.tokenUsage}</div>
            )}
            {/* {data.parameters && Object.keys(data.parameters).length > 0 && (
              <div>
                <br />
                <strong>parameters:</strong>
                {Object.entries(data.parameters).map(([key, value]) => (
                  <div key={key}>
                    {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </div>
                ))}
              </div>
            )} */}
          </div>
        }
        placement="top"
      >
        <Card
          size="small"
          style={{
            width: 200,
            backgroundColor: getStatusColor(data.status),
            border: `2px solid ${getBorderColor(data.status)}`,
            borderRadius: 8,
            cursor: 'pointer',
          }}
          bodyStyle={{ padding: '8px 12px' }}
        >
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text strong style={{ fontSize: '12px' }}>
                {data.name}
              </Text>
              {getStatusIcon(data.status)}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Badge
                text={data.type}
                style={{ fontSize: '10px' }}
                color={getBorderColor(data.status)}
              />
              <Text type="secondary" style={{ fontSize: '10px' }}>
                {data.model}
              </Text>
            </div>

            {data.tokenUsage && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                marginTop: 4,
                padding: '2px 6px',
                backgroundColor: 'rgba(24, 144, 255, 0.1)',
                borderRadius: 4,
                border: '1px solid rgba(24, 144, 255, 0.2)'
              }}>
                <FireOutlined style={{ color: '#ff7875', marginRight: 4, fontSize: '10px' }} />
                <Text style={{ fontSize: '10px', color: '#1890ff', fontWeight: 'bold' }}>
                  {data.tokenUsage} tokens
                </Text>
              </div>
            )}

            {data.executionTime && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                marginTop: 2,
                padding: '2px 6px',
                backgroundColor: 'rgba(82, 196, 26, 0.1)',
                borderRadius: 4,
                border: '1px solid rgba(82, 196, 26, 0.2)'
              }}>
                <ThunderboltOutlined style={{ color: '#52c41a', marginRight: 4, fontSize: '10px' }} />
                <Text style={{ fontSize: '10px', color: '#52c41a', fontWeight: 'bold' }}>
                  {data.executionTime}s
                </Text>
              </div>
            )}
          </Space>
        </Card>
      </Tooltip>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555' }}
        isConnectable={isConnectable}
      />
    </div>
  );
};

// 节点类型配置
const nodeTypes = {
  operatorNode: OperatorNode,
};

  const OperatorDAG = ({ operators, dagData, onNodeClick }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // console.log('OperatorDAG - dagData:', dagData);
  // console.log('OperatorDAG - operators:', operators);

  // 构建层次化布局的辅助函数
  const buildHierarchicalLayout = useCallback((dagData) => {
    //console.log('buildHierarchicalLayout:', dagData);
    if (!dagData || !dagData.nodes || !dagData.edges || typeof dagData.edges !== 'object') {
      return { nodePositions: {}, maxDepth: 0 };
    }
    
    // 处理nodes数据结构 - 可能是数组或对象
    let nodesArray = [];
    if (Array.isArray(dagData.nodes)) {
      nodesArray = dagData.nodes;
    } else if (typeof dagData.nodes === 'object') {
      // 将对象转换为数组
      nodesArray = Object.values(dagData.nodes);
    }
    
    if (nodesArray.length === 0) {
      return { nodePositions: {}, maxDepth: 0 };
    }
    
    // 构建邻接表和入度计算
    const adjacencyList = {};
    const inDegree = {};
    const nodeIds = nodesArray.map(node => String(node.id)); // 确保转换为字符串

    // 初始化
    nodeIds.forEach(id => {
      adjacencyList[id] = [];
      inDegree[id] = 0;
    });

    // 构建图结构
    Object.entries(dagData.edges).forEach(([source, targets]) => {
      const sourceStr = String(source); // 确保转换为字符串
      targets.forEach(target => {
        const targetStr = String(target); // 确保转换为字符串
        if (nodeIds.includes(sourceStr) && nodeIds.includes(targetStr)) {
          adjacencyList[sourceStr].push(targetStr);
          inDegree[targetStr]++;
        }
      });
    });

    // 拓扑排序确定层次
    const levels = {};
    const queue = [];
    const visited = new Set();

    // 找到所有根节点（入度为0的节点）
    nodeIds.forEach(id => {
      if (inDegree[id] === 0) {
        queue.push(id);
        levels[id] = 0;
      }
    });

    let currentLevel = 0;
    let maxDepth = 0;

    // BFS分层
    while (queue.length > 0) {
      const levelSize = queue.length;
      const currentLevelNodes = [];
      //console.log('Current Level:', currentLevel, 'Nodes:', queue);
      for (let i = 0; i < levelSize; i++) {
        const node = queue.shift();
        currentLevelNodes.push(node);
        visited.add(node);

        adjacencyList[node].forEach(neighbor => {
          inDegree[neighbor]--;
          if (inDegree[neighbor] === 0 && !visited.has(neighbor)) {
            levels[neighbor] = currentLevel + 1;
            queue.push(neighbor);
          }
        });
      }

      maxDepth = Math.max(maxDepth, currentLevel);
      currentLevel++;
    }

    // 为每层节点分配位置
    const nodePositions = {};
    const levelNodeCounts = {};

    // 计算每层节点数
    Object.entries(levels).forEach(([nodeId, level]) => {
      if (!levelNodeCounts[level]) {
        levelNodeCounts[level] = [];
      }
      levelNodeCounts[level].push(nodeId);
    });

    // 分配坐标
    Object.entries(levelNodeCounts).forEach(([level, nodeIds]) => {
      const levelNum = parseInt(level);
      const nodeCount = nodeIds.length;
      const levelWidth = Math.max(nodeCount * 250, 800); // 确保有足够的宽度
      
      nodeIds.forEach((nodeId, index) => {
        const x = (levelWidth / (nodeCount + 1)) * (index + 1) - levelWidth / 2 + 400; // 居中
        const y = levelNum * 180 + 100; // 垂直间距180px
        
        nodePositions[nodeId] = { x, y };
      });
    });

    return { nodePositions, maxDepth };
  }, []);

  // 将 DAG 数据转换为节点（直接使用 dagData.nodes 信息）
  const generateNodesFromDAG = useCallback(() => {
    if (!dagData || !dagData.nodes) {
      return [];
    }

    // 处理nodes数据结构 - 可能是数组或对象
    let nodesArray = [];
    if (Array.isArray(dagData.nodes)) {
      nodesArray = dagData.nodes;
    } else if (typeof dagData.nodes === 'object') {
      // 将对象转换为数组
      nodesArray = Object.values(dagData.nodes);
    }

    if (nodesArray.length === 0) {
      return [];
    }

    // 使用DAG数据构建层次化布局
    const { nodePositions } = buildHierarchicalLayout(dagData);
    
    return nodesArray.map((dagNode) => {
      const nodeId = String(dagNode.id); // 确保ID是字符串类型
      const position = nodePositions[nodeId] || { x: 100, y: 100 };

      // 直接使用 DAG 节点数据，设置默认值
      const nodeData = {
        id: nodeId,
        name: dagNode.name || `Node-${dagNode.id}`,
        type: dagNode.type || 'Unknown',
        status: dagNode.status || 'enabled',
        model: dagNode.parameters.model || 'default',
        parameters: dagNode.parameters || {},
        // 使用真实的性能数据（如果存在）
        executionTime: dagNode.parameters.time || '0',
        tokenUsage: dagNode.tokenUsage || '0',
      };

      return {
        id: nodeId, // 使用字符串类型的ID
        type: 'operatorNode',
        position,
        data: nodeData,
        draggable: true,
      };
    });
  }, [dagData, buildHierarchicalLayout]);

  // 从DAG数据生成边连接
  const generateEdgesFromDAG = useCallback(() => {
    if (!dagData || !dagData.edges || typeof dagData.edges !== 'object') {
      return [];
    }

    // 使用DAG数据构建真实的边连接
    const edges = [];
    
    Object.entries(dagData.edges).forEach(([source, targets]) => {
      const sourceStr = String(source); // 确保转换为字符串
      targets.forEach((target, index) => {
        const targetStr = String(target); // 确保转换为字符串
        
        // 检查节点状态来决定是否显示动画（从 dagData.nodes 中获取）
        let sourceNode = null;
        let targetNode = null;
        
        if (dagData.nodes) {
          const nodesArray = Array.isArray(dagData.nodes) ? dagData.nodes : Object.values(dagData.nodes);
          sourceNode = nodesArray.find(node => String(node.id) === sourceStr);
          targetNode = nodesArray.find(node => String(node.id) === targetStr);
        }
        
        const isAnimated = sourceNode?.status === 'running' || 
                          targetNode?.status === 'running';
        
        edges.push({
          id: `e${sourceStr}-${targetStr}-${index}`, // 使用字符串拼接
          source: sourceStr, // 使用字符串类型
          target: targetStr, // 使用字符串类型
          type: 'smoothstep',
          style: { 
            stroke: isAnimated ? '#1890ff' : '#999', 
            strokeWidth: isAnimated ? 3 : 2 
          },
          animated: isAnimated,
          markerEnd: {
            type: 'arrow',
            color: isAnimated ? '#1890ff' : '#999',
          },
        });
      });
    });

    return edges;
  }, [dagData]);

  // 更新节点和边
  useEffect(() => {
    // 只使用 dagData 来生成节点和边
    if (!dagData) {
      setNodes([]);
      setEdges([]);
      return;
    }
    
    const newNodes = generateNodesFromDAG();
    const newEdges = generateEdgesFromDAG();
    
    setNodes(newNodes);
    setEdges(newEdges);
  }, [dagData, generateNodesFromDAG, generateEdgesFromDAG, setNodes, setEdges]);

  // 处理连接
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // 处理节点点击
  const onNodeClickHandler = useCallback((event, node) => {
    setSelectedNode(node.data);
    setModalVisible(true);
    
    if (onNodeClick) {
      onNodeClick(node.data);
    }
  }, [onNodeClick]);

  const proOptions = { hideAttribution: true };

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClickHandler}
        nodeTypes={nodeTypes}
        proOptions={proOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            switch (node.data.status) {
              case 'enabled':
              case 'completed':
                return '#52c41a';
              case 'running':
                return '#1890ff';
              case 'pending':
                return '#faad14';
              case 'error':
                return '#ff4d4f';
              default:
                return '#d9d9d9';
            }
          }}
          style={{
            height: 120,
            width: 200,
          }}
        />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>

      {/* 操作符详情模态框 */}
      <Modal
        title={`Operator details - ${selectedNode?.name || ''}`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedNode && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="name" span={2}>
              <strong>{selectedNode.name}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="type">
              <Tag color="blue">{selectedNode.type}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="status">
              <Badge
                status={
                  selectedNode.status === 'enabled' ? 'success' :
                  selectedNode.status === 'running' ? 'processing' :
                  selectedNode.status === 'pending' ? 'warning' :
                  selectedNode.status === 'error' ? 'error' : 'default'
                }
                text={selectedNode.status}
              />
            </Descriptions.Item>
            <Descriptions.Item label="model">
              {selectedNode.model}
            </Descriptions.Item>
            <Descriptions.Item label="ID">
              <code>{selectedNode.id}</code>
            </Descriptions.Item>
            
            {selectedNode.tokenUsage && (
              <Descriptions.Item label="Token">
                <Space>
                  <FireOutlined style={{ color: '#ff7875' }} />
                  <strong style={{ color: '#1890ff' }}>{selectedNode.tokenUsage}</strong>
                </Space>
              </Descriptions.Item>
            )}
            
            {selectedNode.executionTime && (
              <Descriptions.Item label="time">
                <Space>
                  <ThunderboltOutlined style={{ color: '#52c41a' }} />
                  <strong style={{ color: '#52c41a' }}>{selectedNode.executionTime}ms</strong>
                </Space>
              </Descriptions.Item>
            )}

            {selectedNode.parameters && Object.keys(selectedNode.parameters).length > 0 && (
              <Descriptions.Item label="parameters" span={2}>
                <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                  {Object.entries(selectedNode.parameters).map(([key, value]) => (
                    <div key={key} style={{ marginBottom: '8px' }}>
                      <strong>{key}:</strong> {' '}
                      {typeof value === 'object' ? (
                        <pre style={{ 
                          fontSize: '12px', 
                          background: '#f5f5f5', 
                          padding: '4px 8px', 
                          borderRadius: '4px',
                          margin: '4px 0'
                        }}>
                          {JSON.stringify(value, null, 2)}
                        </pre>
                      ) : (
                        <code>{String(value)}</code>
                      )}
                    </div>
                  ))}
                </div>
              </Descriptions.Item>
            )}

            {/* {selectedNode.output && (
              <Descriptions.Item label="输出结果" span={2}>
                <div style={{ 
                  maxHeight: '300px', 
                  overflow: 'auto',
                  background: '#f5f5f5',
                  padding: '8px',
                  borderRadius: '4px'
                }}>
                  <pre style={{ fontSize: '12px', margin: 0 }}>
                    {selectedNode.output}
                  </pre>
                </div>
              </Descriptions.Item>
            )} */}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default OperatorDAG;

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input, Select, Collapse, Space, Typography, Badge, Dropdown, Table, Modal, List, App, Tag, Segmented } from 'antd';
import { 
  PlusOutlined, 
  MoreOutlined, 
  DragOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  CopyOutlined,
  SaveOutlined,
  DatabaseOutlined,
  UnorderedListOutlined,
  NodeIndexOutlined,
  UpOutlined,
  DownOutlined,
  ApiOutlined,
  RobotOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import './OperatorPanel.css';
import OperatorDAG from './OperatorDAG';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


const { Option } = Select;
const { Panel } = Collapse;
const { Title, Text } = Typography;

// 索引选择模态框组件
const IndexSelectionModal = ({ visible, onCancel, onSave, availableIndexes, selectedIndexes, loading }) => {
  const [localSelectedIndexes, setLocalSelectedIndexes] = useState([]);

  // 当模态框打开时，初始化本地选择状态
  useEffect(() => {
    if (visible) {
      setLocalSelectedIndexes(selectedIndexes || []);
    }
  }, [visible, selectedIndexes]);

  const handleSave = () => {
    onSave(localSelectedIndexes);
  };

  const handleSelectAll = () => {
    setLocalSelectedIndexes(availableIndexes.map(index => 
      typeof index === 'string' ? index : index.id
    ));
  };

  const handleClearAll = () => {
    setLocalSelectedIndexes([]);
  };

  return (
    <Modal
      title="Select Indexes"
      open={visible}
      onCancel={onCancel}
      onOk={handleSave}
      okText="Save"
      cancelText="Cancel"
      width={600}
    >
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button size="small" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button size="small" onClick={handleClearAll}>
            Clear All
          </Button>
          <Text type="secondary">
            Selected: {localSelectedIndexes.length} / {availableIndexes.length}
          </Text>
        </Space>
      </div>
      
      <Select
        mode="multiple"
        placeholder="Select indexes..."
        value={localSelectedIndexes}
        onChange={setLocalSelectedIndexes}
        style={{ width: '100%' }}
        loading={loading}
        showSearch
        filterOption={(input, option) =>
          option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
        }
      >
        {availableIndexes.map((index, i) => (
          <Option key={typeof index === 'string' ? index : index.id || i} 
                  value={typeof index === 'string' ? index : index.id}>
            <div>
              <div>{typeof index === 'string' ? index : index.name}</div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {typeof index === 'string' ? '' : (index.description || '')}
              </Text>
            </div>
          </Option>
        ))}
      </Select>
    </Modal>
  );
};

// 算子参数配置
const OPERATOR_PARAMETERS = {
  Extract: [
    { key: 'mode', label: 'Mode', type: 'select', options: ['basic', 'semantic'], placeholder: 'Select mode' },
    { key: 'tablename', label: 'Table Name', type: 'input', placeholder: 'tablename' },
    { key: 'columns', label: 'Columns', type: 'columns', placeholder: 'Add columns' },
    { key: 'prompt', label: 'Prompt', type: 'textarea', placeholder: 'Enter your prompt here...' }
  ],
  Filter: [
    { key: 'mode', label: 'Mode', type: 'select', options: ['basic', 'semantic'], placeholder: 'Select mode' },
    { key: 'tablename', label: 'Table Name', type: 'input', placeholder: 'tablename' },
    { key: 'condition', label: 'Filter Condition', type: 'input' ,placeholder:'condition'},
    { key: 'cascade', label: 'Cascade', type: 'switch', placeholder: 'Enable cascade mode' },
    { key: 'columns', label: 'Columns', type: 'columns', placeholder: 'Add columns' },
    { key: 'prompt', label: 'Prompt', type: 'textarea', placeholder: 'Enter your prompt here...' }
  ],
  Retrieve: [
    { key: 'tablename', label: 'Table Name', type: 'input', placeholder: 'tablename' },
    { key: 'columns', label: 'Columns', type: 'columns', placeholder: 'Add columns' },
  ],
  Aggregation: [
    { key: 'function', label: 'Aggregation Function', type: 'select', options: ['sum', 'avg', 'count', 'max', 'min'], placeholder: 'Select function' },
    { key: 'group_by', label: 'Group By Field', type: 'input', placeholder: 'Field name to group by' }
  ],
  Join: [
    { key: 'join_type', label: 'Join Type', type: 'select', options: ['inner', 'left', 'right', 'outer'], placeholder: 'Select join type' },
    { key: 'join_key', label: 'Join Key', type: 'input', placeholder: 'Field name to join on' }
  ],
  Sort: [
    { key: 'sort_field', label: 'Sort Field', type: 'input', placeholder: 'Field name to sort by' },
    { key: 'order', label: 'Sort Order', type: 'select', options: ['asc', 'desc'], placeholder: 'Select order' }
  ],
  Group: [
    { key: 'group_field', label: 'Group Field', type: 'input', placeholder: 'Field name to group by' },
    { key: 'aggregations', label: 'Aggregations', type: 'input', placeholder: 'e.g., count, sum(value)' }
  ],
  Projection: [
    { key: 'selected_fields', label: 'Selected Fields', type: 'input', placeholder: 'Comma-separated field names' },
    { key: 'exclude_fields', label: 'Exclude Fields', type: 'input', placeholder: 'Comma-separated field names to exclude' }
  ]
};

// 列名输入组件
const ColumnInput = ({ value = [], onChange }) => {
  const handleAddColumn = () => {
    const newColumn = { columnname: '', description: '' };
    onChange([...value, newColumn]);
  };

  const handleRemoveColumn = (index) => {
    const newColumns = value.filter((_, i) => i !== index);
    onChange(newColumns);
  };

  const handleColumnChange = (index, field, newValue) => {
    const newColumns = value.map((col, i) => 
      i === index ? { ...col, [field]: newValue } : col
    );
    onChange(newColumns);
  };

  return (
    <div style={{ marginTop: 4 }}>
      {value.map((column, index) => (
        <div key={index} style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '8px', 
          alignItems: 'center' 
        }}>
          <Input
            placeholder="Column Name"
            value={column.columnname}
            onChange={(e) => handleColumnChange(index, 'columnname', e.target.value)}
            style={{ flex: 0.8 }}
            size="small"
          />
          <Input
            placeholder="Description"
            value={column.description}
            onChange={(e) => handleColumnChange(index, 'description', e.target.value)}
            style={{ flex: 2 }}
            size="small"
          />
          <Button
            type="text"
            size="small"
            danger
            onClick={() => handleRemoveColumn(index)}
            style={{ minWidth: '24px', padding: '0 4px' }}
          >
            ×
          </Button>
        </div>
      ))}
      <Button
        type="dashed"
        size="small"
        icon={<PlusOutlined />}
        onClick={handleAddColumn}
        style={{ width: '100%' }}
      >
        Add Column
      </Button>
    </div>
  );
};

// 自定义Switch组件
const CustomSwitch = ({ checked = false, onChange, onLabel = 'ON', offLabel = 'OFF' }) => {
  const handleChange = (e) => {
    onChange(e.target.checked);
  };

  return (
    <label className="switch">
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={handleChange}
      />
      <span>{offLabel}</span>
      <span>{onLabel}</span>
    </label>
  );
};

// 参数输入组件
const ParameterInput = ({ parameter, value, onChange }) => {
  const handleChange = (newValue) => {
    onChange(parameter.key, newValue);
  };

  switch (parameter.type) {
    case 'columns':
      return (
        <ColumnInput
          value={value || []}
          onChange={handleChange}
        />
      );
    case 'switch':
      return (
        <CustomSwitch
          checked={value === true || value === 'true'}
          onChange={handleChange}
          onLabel="ON"
          offLabel="OFF"
        />
      );
    case 'select':
      return (
        <Select
          value={value}
          onChange={handleChange}
          placeholder={parameter.placeholder}
          style={{ width: '100%', marginTop: 4 }}
          size="small"
          allowClear
        >
          {parameter.options.map(option => (
            <Option key={option} value={option}>{option}</Option>
          ))}
        </Select>
      );
    case 'textarea':
      return (
        <Input.TextArea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={parameter.placeholder}
          rows={2}
          style={{ width: '100%', marginTop: 4 }}
          size="small"
        />
      );
    case 'number':
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={parameter.placeholder}
          min={parameter.min}
          max={parameter.max}
          step={parameter.step}
          style={{ width: '100%', marginTop: 4 }}
          size="small"
        />
      );
    default: // 'input'
      return (
        <Input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={parameter.placeholder}
          style={{ width: '100%', marginTop: 4 }}
          size="small"
        />
      );
  }
};

// 可排序的算子卡片组件
const SortableOperatorCard = ({ operator, onOperatorChange, onRunOperator, onDeleteOperator, onDuplicateOperator, onRowClick }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(operator.name);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: operator.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition, // 拖拽时完全禁用transition
    zIndex: isDragging ? 1000 : 'auto', // 拖拽时提高层级
    opacity: isDragging ? 0.9 : 1, // 拖拽时轻微透明
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'enabled': return 'green';
      case 'running': return 'blue';
      case 'pending': return 'orange';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const handleNameEdit = () => {
    setIsEditingName(true);
    setTempName(operator.name);
  };

  const handleNameSave = () => {
    if (tempName.trim() && tempName !== operator.name) {
      onOperatorChange(operator.id, 'name', tempName.trim());
    }
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setTempName(operator.name);
    setIsEditingName(false);
  };

  const operatorMenuItems = [
    {
      key: '1',
      label: 'Rename',
      onClick: handleNameEdit
    },
    {
      key: '2',
      label: 'Duplicate',
      icon: <CopyOutlined />,
      onClick: () => onDuplicateOperator(operator.id)
    },
    {
      key: '3',
      label: 'Delete',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => onDeleteOperator(operator.id)
    }
  ];

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`operator-card ${isCollapsed ? 'collapsed' : ''}`}
      size="small"
      data-status={operator.status}
    >
      <div className="operator-header">
        <div className="operator-info">
          <Space>
            <DragOutlined 
              className="drag-handle" 
              {...attributes} 
              {...listeners}
            />
            {isEditingName ? (
              <Space size="small">
                <Input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onPressEnter={handleNameSave}
                  onBlur={handleNameSave}
                  size="small"
                  style={{ width: 120 }}
                  autoFocus
                />
                <Button size="small" type="text" onClick={handleNameCancel}>✕</Button>
              </Space>
            ) : (
              <Badge 
                status={getStatusColor(operator.status)} 
                text={
                  <span 
                    onDoubleClick={handleNameEdit}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Double click to edit"
                  >
                    {operator.name}
                  </span>
                }
              />
            )}
          </Space>
        </div>
        <div className="operator-actions">
          <Button
            size="small"
            type="text"
            icon={isCollapsed ? <DownOutlined /> : <UpOutlined />}
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "展开" : "折叠"}
          />
          <Button
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => onRunOperator(operator.id)}
            loading={operator.status === 'running'}
          >
            Run
          </Button>
          <Dropdown
            menu={{ items: operatorMenuItems }}
            trigger={['click']}
          >
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </div>
      </div>

      <div className="operator-content">
        {isCollapsed ? (
          // 折叠状态下的简化视图
          <div className="operator-grid collapsed">
            <div className="grid-row four-columns">
              <div className="grid-item">
                <div className="field-icon-label">
                  <ApiOutlined className="field-icon" />
                  <Text className="field-label">Type</Text>
                </div>
                <Text strong>{operator.type}</Text>
              </div>
              <div className="grid-item">
                <div className="field-icon-label">
                  <RobotOutlined className="field-icon" />
                  <Text className="field-label">Model</Text>
                </div>
                <Text strong>{operator.model}</Text>
              </div>
              <div className="grid-item">
                <div className="field-icon-label">
                  <ThunderboltOutlined className="field-icon" />
                  <Text className="field-label">Token</Text>
                </div>
                <Text strong>{operator.tokenUsage || 0}</Text>
              </div>
              <div className="grid-item">
                <div className="field-icon-label">
                  <ClockCircleOutlined className="field-icon" />
                  <Text className="field-label">Time</Text>
                </div>
                <Text strong>{operator.executionTime || 0}s</Text>
              </div>
            </div>
          </div>
        ) : (
          // 展开状态下的完整视图
          <div className="operator-grid">
            {/* 第一行：Type 和 Model */}
            <div className="grid-row">
              <div className="grid-item">
                <Text className="field-label">Type</Text>
                <Select
                  value={operator.type}
                  onChange={(value) => onOperatorChange(operator.id, 'type', value)}
                  style={{ width: '100%' }}
                  size="small"
                >
                  <Option value="Extract">Extract</Option>
                  <Option value="Filter">Filter</Option>
                  <Option value="Retrieve">Retrieve</Option>
                  <Option value="Aggregation">Aggregation</Option>
                  <Option value="Join">Join</Option>
                  <Option value="Sort">Sort</Option>
                  <Option value="Group">Group</Option>
                  <Option value="Projection">Projection</Option>
                </Select>
              </div>
              <div className="grid-item">
                <Text className="field-label">Model</Text>
                <Select
                  value={operator.model}
                  onChange={(value) => onOperatorChange(operator.id, 'model', value)}
                  style={{ width: '100%' }}
                  size="small"
                >
                  <Option value="gpt-4o">gpt-4o</Option>
                  <Option value="gpt-4.1">gpt-4.1</Option>
                  <Option value="claude">claude</Option>
                </Select>
              </div>
            </div>

            {/* 动态参数区域 */}
            {OPERATOR_PARAMETERS[operator.type] && 
              OPERATOR_PARAMETERS[operator.type]
                .filter((param) => {
                  // 如果是Extract算子，根据mode参数过滤显示的字段
                  if (operator.type === 'Extract') {
                    const mode = operator.parameters?.mode || 'basic';
                    if (mode === 'basic') {
                      // basic模式显示：mode, tablename, columns
                      return ['mode', 'tablename', 'columns'].includes(param.key);
                    } else if (mode === 'semantic') {
                      // semantic模式显示：mode, tablename, prompt
                      return ['mode', 'tablename', 'prompt'].includes(param.key);
                    }
                  }
                  else if (operator.type === 'Filter') {
                    const mode = operator.parameters?.mode || 'basic';
                    if (mode === 'basic') {
                      // basic模式显示：mode, tablename, condition, cascade, columns
                      return ['mode', 'tablename', 'condition', 'cascade', 'columns'].includes(param.key);
                    } else if (mode === 'semantic') {
                      // semantic模式显示：mode, tablename, prompt
                      return ['mode', 'tablename', 'prompt'].includes(param.key);
                    }
                  }
                  // 其他算子显示所有参数
                  return true;
                })
                .reduce((rows, param, index, array) => {
                  // 将参数按行分组，每行最多2个
                  if (index % 2 === 0) {
                    const nextParam = array[index + 1];
                    const isFullWidth = param.type === 'textarea' || param.type === 'columns' ;
                    
                    if (isFullWidth && !nextParam) {
                      // 单独占一行的元素
                      rows.push([param]);
                    } else {
                      // 两个元素一行
                      rows.push(nextParam ? [param, nextParam] : [param]);
                    }
                  }

                  return rows;
                }, [])
                .map((rowParams, rowIndex) => (
                  <div key={rowIndex} className={`grid-row ${rowParams.length === 1 ? 'full-width' : ''}`}>
                    {rowParams.map((param) => (
                      <div key={param.key} className="grid-item">
                        <Text className="field-label">{param.label}</Text>
                        <ParameterInput
                          parameter={param}
                          value={operator.parameters?.[param.key] || ''}
                          onChange={(key, value) => {
                            const newParameters = { ...(operator.parameters || {}), [key]: value };
                            onOperatorChange(operator.id, 'parameters', newParameters);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ))
            }

            {operator.output && (
              <div className="output-section">
                <Collapse size="small">
                  <Panel header="Output Result" key="1">
                    {(() => {
                      // 尝试解析为表格数据
                      try {
                        const data = JSON.parse(operator.output);
                        if (Array.isArray(data?.columns) && Array.isArray(data?.data)) {
                          // 过滤掉以 _ 开头的内部字段
                          const visibleKeys = data.columns.filter(key => !key.startsWith('_'));
                          const columns = visibleKeys.map(key => ({
                            title: key,
                            dataIndex: key,
                            key: key,
                            width: 120,
                          }));
                          
                          const dataSource = data.data.map((arr, i) => {
                            const obj = {};
                            data.columns.forEach((k, j) => (obj[k] = arr[j]));
                            obj.key = data.index?.[i] ?? i;
                            return obj;
                          });

                          return (
                            <Table
                              columns={columns}
                              dataSource={dataSource}
                              pagination={false}
                              size="small"
                              bordered
                              scroll={{ x: 'max-content' }}
                              onRow={(record) => ({
                                onClick: (event) => {
                                  // 获取点击的列
                                  const target = event.target;
                                  let columnKey = null;
                                  
                                  // 尝试从td元素获取data-key属性
                                  const td = target.closest('td');
                                  if (td) {
                                    // 获取列索引
                                    const columnIndex = Array.from(td.parentNode.children).indexOf(td);
                                    // 只从可见列中获取key，排除以_开头的字段
                                    const visibleKeys = Object.keys(record).filter(key => !key.startsWith('_'));
                                    columnKey = visibleKeys[columnIndex];
                                  }
                                  
                                  // 如果没找到，使用第一个可见列作为默认
                                  if (!columnKey) {
                                    const visibleKeys = Object.keys(record).filter(key => !key.startsWith('_'));
                                    columnKey = visibleKeys[0];
                                  }
                                  
                                  //console.log('Clicked column:', columnKey, 'Value:', record[columnKey]);
                                  
                                  if (onRowClick) {
                                    onRowClick(record, columnKey);
                                  }
                                },
                                style: { cursor: 'pointer' }
                              })}
                            />
                          );
                        }
                      } catch (e) {
                        // 如果不是 JSON 或不是表格格式，就显示原始文本
                      }
                      
                      // 默认显示文本
                      return <Text code style={{ whiteSpace: 'pre-wrap' }}>{operator.output}</Text>;
                    })()}
                  </Panel>
                </Collapse>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

const OperatorPanel = ({ documents, onRowClick, showBackButton = false, onBackToProjects, projectInfo }) => {
  const { message } = App.useApp();
  
  // 添加视图模式状态
  const [viewMode, setViewMode] = useState('list'); // 'list' 或 'dag'
  
  // 添加 DAG 数据状态
  const [dagData, setDagData] = useState(null);
  
  const [operators, setOperators] = useState([]);



  // 索引选择相关状态
  const [indexModalVisible, setIndexModalVisible] = useState(false);
  const [selectedGlobalIndexes, setSelectedGlobalIndexes] = useState([]); // 全局选中的索引
  const [availableIndexes, setAvailableIndexes] = useState([]);
  const [loadingIndexes, setLoadingIndexes] = useState(false);

  // // 页面加载时自动获取最新的workflow
  // useEffect(() => {
  //   (async () => {
  //     try {
  //       const res = await fetch('http://localhost:5000/api/workflow/latest');
  //       if (res.ok) {
  //         const saved = await res.json();
  //         if (saved?.version === 1 && Array.isArray(saved.operators)) {
  //           setOperators(saved.operators);
  //           return; // 成功就不再读 localStorage
  //         }
  //       }
  //     } catch (error) {
  //       console.error('获取最新workflow失败:', error);
  //       // 如果获取失败，保持默认的operators
  //     }
  //   })();
  // }, []);
  const [savingWorkflow, setSavingWorkflow] = useState(false);

  // 获取可用索引列表
  const fetchIndexes = useCallback(async () => {
    setLoadingIndexes(true);
    try {
      const response = await fetch(`http://localhost:5000/api/existindex?function_name=${projectInfo?.function_name}`);
      if (!response.ok) {
        throw new Error('Failed to fetch indexes');
      }
      const data = await response.json();
      console.log('Fetched indexes:', data);
      setAvailableIndexes(data.indexes || []);
    } catch (error) {
      console.error('Failed to fetch indexes:', error);
      message.error('Failed to load index options');
    } finally {
      setLoadingIndexes(false);
    }
  }, [message]);

  // 组件挂载时获取索引列表
  useEffect(() => {
    fetchIndexes();
  }, [fetchIndexes]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 减少激活距离，提高响应性
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    // 拖拽开始时的处理
    const { active } = event;
    // 可以在这里添加拖拽开始时的视觉反馈
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setOperators((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddOperator = () => {
    const newOperator = {
      id: Date.now().toString(),
      name: `test_${operators.length + 1}`,
      type: 'Extract',
      prompt: '',
      model: 'gpt-4o',
      status: 'pending',
      output: null,
      collapsed: false,
      parameters: { mode: 'basic' } // 默认设置为basic模式
    };
    setOperators([...operators, newOperator]);
  };

  const handleOperatorChange = (id, field, value) => {
    setOperators(operators.map(op => {
      if (op.id === id) {
        const updatedOp = { ...op, [field]: value };
        // 如果改变的是算子类型，重置参数
        if (field === 'type') {
          if (value === 'Extract' || value === 'Filter') {
            updatedOp.parameters = { mode: 'basic' }; // Extract算子默认为basic模式
          } else {
            updatedOp.parameters = {};
          }
        }
        return updatedOp;
      }
      return op;
    }));
  };

  // 更新项目的 function_name
  const updateProjectFunctionName = async (functionName) => {
    if (!projectInfo?.id || !functionName) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/projects/${projectInfo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          function_name: functionName
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Project function_name updated:', result);
      
      // 更新本地的 projectInfo
      if (projectInfo) {
        projectInfo.new_function_name = functionName;
      }
      
    } catch (error) {
      console.error('Failed to update project function_name:', error);
      message.error('更新项目 function_name 失败');
    }
  };

  const handleRunOperator = async(id) => {
    setOperators(operators.map(op => 
      op.id === id ? { ...op, status: 'running' } : op
    ));
    const operator = operators.find(op => op.id === id);
    let response
    try {
      // 处理columns参数，生成column_name列表和描述信息
      const processedParameters = { ...operator.parameters };
      if (operator.parameters?.columns && Array.isArray(operator.parameters.columns)) {
        // 生成column_name列表
        processedParameters.column_name = operator.parameters.columns
          .filter(col => col.columnname && col.columnname.trim())
          .map(col => col.columnname.trim());
        
        // 生成包含描述的prompt字符串
        const columnDescriptions = operator.parameters.columns
          .filter(col => col.columnname && col.columnname.trim())
          .map(col => `${col.columnname.trim()}${col.description ? ':' + col.description.trim() : ''}`)
          .join('\n');
        
        if (columnDescriptions) {
          processedParameters.columns_prompt = columnDescriptions;
        }
        
        // 对于Extract算子，保留原始的columns参数，让后端接收所有三个参数
        if (operator.type !== 'Extract' && operator.type !== 'Filter') {
          delete processedParameters.columns;
        }
      }

      // 获取选中索引的名称列表
      const selectedIndexNames = selectedGlobalIndexes.map(id => {
        const index = availableIndexes.find(idx => idx.id === id);
        return index ? index.name : id;
      });

      if (operator.type === 'Extract') {
        response = await fetch('http://localhost:5000/api/extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: operator.type,
            prompt: operator.prompt,
            model: operator.model,
            parameters: processedParameters, // 包含所有三个参数：tablename, columns, prompt
            function_name: projectInfo?.new_function_name || null,
            selected_indexes: selectedIndexNames || [] // 使用索引名称列表
          })
        });
      }
      else if (operator.type ==='Filter') {
        response = await fetch('http://localhost:5000/api/filter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            type: operator.type,
            prompt: operator.prompt,
            model: operator.model,
            parameters: processedParameters,
            function_name: projectInfo?.new_function_name || null,
            selected_indexes: selectedIndexNames || [] // 使用索引名称列表
          })
        });
      }
      else if (operator.type ==='Retrieve') {
        response = await fetch('http://localhost:5000/api/retrieve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            type: operator.type,
            prompt: operator.prompt,
            model: operator.model,
            parameters: processedParameters,
            function_name: projectInfo?.new_function_name || null,
            selected_indexes: selectedIndexNames || [] // 使用索引名称列表
          })
        });
      }





      const data = await response.json(); // 解析 JSON 数据
      
      // 如果返回了 function_name，更新项目信息并保存到 projects.json

      await updateProjectFunctionName(data.function_name);
      console.log(projectInfo)
      setOperators(prev => prev.map(op => 
        op.id === id ? { 
          ...op, 
          status: 'enabled',
          output: JSON.stringify(data.table) // 将数据转为字符串存储
          
        } : op
      ));
      handleSaveWorkflow();
    }
    catch (e) {
      console.error('API调用失败:', e);
      setOperators(prev => prev.map(op =>
        op.id === id
          ? { ...op, status: 'error', output: '出错了: ' + e.message }
          : op
      ));
    }
  };

  const handleDeleteOperator = (id) => {
    setOperators(operators.filter(op => op.id !== id));
  };

  const handleDuplicateOperator = (id) => {
    const operator = operators.find(op => op.id === id);
    if (operator) {
      const newOperator = {
        ...operator,
        id: Date.now().toString(),
        name: operator.name + '_copy',
        parameters: { ...operator.parameters }
      };
      setOperators([...operators, newOperator]);
    }
  };

  // 处理索引选择
  const handleSelectIndexes = () => {
    setIndexModalVisible(true);
  };

  // 保存索引选择
  const handleSaveIndexSelection = async (selectedIndexIds) => {
    try {
      // 获取选中索引的名称列表
      const selectedIndexNames = selectedIndexIds.map(id => {
        const index = availableIndexes.find(idx => idx.id === id);
        return index ? index.name : id;
      });

      const response = await fetch('http://localhost:5000/api/save-index-selection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          function_name: projectInfo?.new_function_name || null,
          selected_indexes: selectedIndexNames // 传递名称列表而不是ID
        })
      });
      console.log('Selected index names:', selectedIndexNames);
      
      if (!response.ok) {
        throw new Error('Failed to save index selection');
      }

      const result = await response.json();
      setSelectedGlobalIndexes(selectedIndexIds);
      setIndexModalVisible(false);
      message.success(`索引选择已保存 (${result.selected_count} 个索引)`);
      
    } catch (error) {
      console.error('Failed to save index selection:', error);
      message.error('保存索引选择失败');
    }
  };

  const handleSaveWorkflow = async () => {
    try {
      setSavingWorkflow(true);
      
      const workflow = {
        operators
      };
      
      const response = await fetch('http://localhost:5000/api/save-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          function_name: projectInfo?.function_name,
          operators:workflow
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Workflow saved:', result);
      
      message.success("Saved successfully!");
      
    } catch (error) {
      console.error('保存工作流失败:', error);
      message.error('保存工作流失败: ' + error.message);
    } finally {
      setSavingWorkflow(false);
    }
  };

  const handleRunAllOperators = () => {
    const pendingOperators = operators.filter(op => op.status === 'pending' || op.status === 'enabled');
    
    if (pendingOperators.length === 0) {
      message.info('没有需要运行的算子');
      return;
    }

    // 设置所有算子为运行状态
    setOperators(prev => prev.map(op => 
      pendingOperators.find(pending => pending.id === op.id) 
        ? { ...op, status: 'running' } 
        : op
    ));

    // 依次运行所有算子
    pendingOperators.forEach(async (operator, index) => {
      let response;
      
      // 处理columns参数，生成column_name列表和描述信息
      const processedParameters = { ...operator.parameters };
      if (operator.parameters?.columns && Array.isArray(operator.parameters.columns)) {
        // 生成column_name列表
        processedParameters.column_name = operator.parameters.columns
          .filter(col => col.columnname && col.columnname.trim())
          .map(col => col.columnname.trim());
        
        // 生成包含描述的prompt字符串
        const columnDescriptions = operator.parameters.columns
          .filter(col => col.columnname && col.columnname.trim())
          .map(col => `${col.columnname.trim()}${col.description ? ':' + col.description.trim() : ''}`)
          .join('\n');
        
        if (columnDescriptions) {
          processedParameters.columns_prompt = columnDescriptions;
        }
        
        // 移除原始的columns数组，避免发送给后端
        delete processedParameters.columns;
      }
      
      if (operator.type === 'Extract') {
        response = await fetch('http://localhost:5000/api/extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: operator.type,
            prompt: operator.prompt,
            model: operator.model,
            parameters: processedParameters,
            function_name: projectInfo?.function_name || null
          })
        });
      }
      else if (operator.type ==='Filter') {
        response = await fetch('http://localhost:5000/api/filter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            type: operator.type,
            prompt: operator.prompt,
            model: operator.model,
            parameters: operator.parameters || {},
            function_name: projectInfo?.function_name || null
          })
        });
      }
      const data = await response.json();
      
      // 如果返回了 function_name，更新项目信息并保存到 projects.json
      
      // await updateProjectFunctionName(data.function_name);
      setOperators(prev => prev.map(op => 
        op.id === operator.id ? {
          ...op,
          status: 'enabled',
          output: JSON.stringify(data) 
        } : op
      ));

    });

        message.success(`开始批量运行 ${pendingOperators.length} 个算子`);
  };

  // 加载项目数据 (operators, nodes, indeg, edges)
  const loadProjectData = async (functionName) => {
    if (!functionName) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/project-data/${functionName}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const projectData = await response.json();
      console.log('Fetched project data:', projectData);
      // 更新 operators
      if (projectData.operators) {
        setOperators(projectData.operators);
      }
      
      // 更新 DAG 数据
      if (projectData.nodes || projectData.edges) {
        setDagData({
          nodes: projectData.nodes || [],
          edges: projectData.edges || {},
          indeg: projectData.indeg || {}
        });
      }
      
      console.log('Project data loaded:', projectData);
    } catch (error) {
      console.error('加载项目数据失败:', error);
      message.error('加载项目数据失败: ' + error.message);
    }
  };

  // 组件挂载时加载项目数据
  useEffect(() => {
    if (projectInfo?.function_name) {
      loadProjectData(projectInfo.function_name);
    }
  }, [projectInfo?.function_name]);

  
  // const fetchSavedWorkflows = async () => {
  //   try {
  //     setLoadingWorkflows(true);
  //     const response = await fetch('http://localhost:5000/api/workflows');
      
  //     if (!response.ok) {
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }
      
  //     const workflows = await response.json();
  //     setSavedWorkflows(workflows);
  //   } catch (error) {
  //     console.error('获取列表失败:', error);
  //     message.error('获取列表失败: ' + error.message);
  //   } finally {
  //     setLoadingWorkflows(false);
  //   }
  // };

  // // 加载指定的工作流
  // const loadWorkflow = async (filename) => {
  //   try {
  //     const response = await fetch(`http://localhost:5000/api/workflows/${filename}`);
      
  //     if (!response.ok) {
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }
      
  //     const workflowData = await response.json();
      
  //     if (workflowData.operators) {
  //       setOperators(workflowData.operators);
  //       message.success(`"${filename}" load successfully！`);
  //       setLoadModalVisible(false);
  //     } else {
  //       message.error('工作流数据格式错误');
  //     }
  //   } catch (error) {
  //     console.error('加载工作流失败:', error);
  //     message.error('加载工作流失败: ' + error.message);
  //   }
  // };

  // // 删除工作流
  // const deleteWorkflow = async (filename) => {
  //   try {
  //     const response = await fetch(`http://localhost:5000/api/workflows/${filename}`, {
  //       method: 'DELETE'
  //     });
      
  //     if (!response.ok) {
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }
      
  //     message.success(`"${filename}" delete successfully！`);
  //     fetchSavedWorkflows(); // 重新获取列表
  //   } catch (error) {
  //     console.error('删除工作流失败:', error);
  //     message.error('删除工作流失败: ' + error.message);
  //   }
  // };

  // // 显示加载工作流对话框
  // const handleLoadWorkflow = () => {
  //   setLoadModalVisible(true);
  //   fetchSavedWorkflows();
  // };



  return (
    <div className="operators-section">
      <div className="operators-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {showBackButton && (
              <Button 
                type="text" 
                size="small"
                onClick={onBackToProjects}
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >
                ← Projects
              </Button>
            )}
            <Title level={4} style={{ margin: 0 }}>
              {projectInfo ? `Document Operator - ${projectInfo.name}` : 'Document Operator'}
            </Title>

          </div>
          <div className="workflow-status" style={{ marginBottom: '16px' }}>
            <Space size="large">
              <Badge status="success" text={`${operators.filter(op => op.status === 'enabled').length} Completed`} />
              <Badge status="processing" text={`${operators.filter(op => op.status === 'running').length} Running`} />
              <Badge status="warning" text={`${operators.filter(op => op.status === 'pending').length} Pending`} />
              <Badge status="error" text={`${operators.filter(op => op.status === 'error').length} Error`} />
            </Space>
          </div>
          
          <div className="workflow-actions">
            <Space size="middle" wrap>
              <Segmented
                options={[
                  {
                    label: 'List View',
                    value: 'list',
                    icon: <UnorderedListOutlined />,
                  },
                  {
                    label: 'DAG View',
                    value: 'dag',
                    icon: <NodeIndexOutlined />,
                  },
                ]}
                value={viewMode}
                onChange={setViewMode}
                size="small"
              />
              <Button 
                size="small"
                onClick={handleRunAllOperators}
                type="default"
                disabled={operators.filter(op => op.status === 'pending' || op.status === 'enabled').length === 0}
              >
                Run All
              </Button>
              <Button 
                size="small"
                icon={<SaveOutlined />}
                onClick={handleSaveWorkflow}
                loading={savingWorkflow}
              >
                Save
              </Button>
              <Button 
                size="small"
                icon={<DatabaseOutlined />}
                onClick={() => setIndexModalVisible(true)}
              >
                Indexes
                {selectedGlobalIndexes.length > 0 && (
                  <Badge 
                    count={selectedGlobalIndexes.length} 
                    size="small" 
                    style={{ marginLeft: 4 }}
                  />
                )}
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddOperator}
              >
                Add Operator
              </Button>
            </Space>
          </div>
        </div>
      </div>

      {/* 根据视图模式显示不同的内容 */}
      {viewMode === 'list' ? (
        <div className="operators-list">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[]}
          >
            <SortableContext 
              items={operators.map(op => op.id)}
              strategy={verticalListSortingStrategy}
            >
              {operators.map((operator) => (
                <SortableOperatorCard
                  key={operator.id}
                  operator={operator}
                  onOperatorChange={handleOperatorChange}
                  onRunOperator={handleRunOperator}
                  onDeleteOperator={handleDeleteOperator}
                  onDuplicateOperator={handleDuplicateOperator}
                  onRowClick={onRowClick}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <div className="operators-dag">
          <OperatorDAG
            operators={operators}
            dagData={dagData || { nodes: [], edges: {}, indeg: {} }}
            onNodeClick={(nodeData) => {
              // 处理节点点击事件，可以显示详细信息或执行操作
              console.log('DAG Node clicked:', nodeData);
              // 显示操作符详情

            }}
          />
        </div>
      )}

      {/* 索引选择模态框 */}
      <IndexSelectionModal
        visible={indexModalVisible}
        onCancel={() => setIndexModalVisible(false)}
        onSave={handleSaveIndexSelection}
        availableIndexes={availableIndexes}
        selectedIndexes={selectedGlobalIndexes}
        loading={loadingIndexes}
      />
    </div>
  );
};

export default OperatorPanel;

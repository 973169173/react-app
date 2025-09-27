import React, { useState, useEffect, useRef } from 'react';
import {Button, Input, Select, Space, Typography,  Avatar, Tag, Table, Collapse, Modal, List, App, Badge, Divider, Card, Steps, Checkbox, Radio } from 'antd';
import { 
  SendOutlined,
  SaveOutlined,
  MessageOutlined,
  UserOutlined,
  RobotOutlined,
  FolderOpenOutlined,
  DatabaseOutlined,
  SettingOutlined,
  StopOutlined

} from '@ant-design/icons';
import { useApiUrl } from '../configContext';

const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;
const { Title, Text } = Typography;

// 索引选择模态框组件
const IndexConfigModal = ({ visible, onCancel, onSave, availableIndexes, selectedIndexes, indexDescriptions, loading }) => {
  const [localSelectedIndexes, setLocalSelectedIndexes] = useState([]);
  const [localDescriptions, setLocalDescriptions] = useState({});

  // 当模态框打开时，初始化本地选择状态
  useEffect(() => {
    if (visible) {
      setLocalSelectedIndexes(selectedIndexes || []);
      setLocalDescriptions(indexDescriptions || {});
    }
  }, [visible, selectedIndexes, indexDescriptions]);

  const handleSave = () => {
    onSave(localSelectedIndexes, localDescriptions);
  };

  const handleSelectAll = () => {
    setLocalSelectedIndexes(availableIndexes.map(index => 
      typeof index === 'string' ? index : index.id
    ));
  };

  const handleClearAll = () => {
    setLocalSelectedIndexes([]);
  };

  const handleDescriptionChange = (indexName, description) => {
    setLocalDescriptions(prev => ({
      ...prev,
      [indexName]: description
    }));
  };

  return (
    <Modal
      title="Configure Indexes and Descriptions"
      open={visible}
      onCancel={onCancel}
      onOk={handleSave}
      okText="Save"
      cancelText="Cancel"
      width={700}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 索引选择部分 */}
        <div>
          <Title level={5}>Select Indexes</Title>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Button size="small" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button size="small" onClick={handleClearAll}>
                Clear All
              </Button>
              <Text style={{ color: '#666666' }}>
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
                  <Text style={{ color: '#666666', fontSize: '12px' }}>
                    {typeof index === 'string' ? '' : (index.description || '')}
                  </Text>
                </div>
              </Option>
            ))}
          </Select>
        </div>

        <Divider />

        {/* 描述配置部分 */}
        <div>
          <Title level={5}>Configure Descriptions</Title>

          
          {localSelectedIndexes.length > 0 ? (
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {localSelectedIndexes.map((indexName) => (
                <div key={indexName} style={{ 
                  padding: '12px', 
                  border: '1px solid #f0f0f0', 
                  borderRadius: '6px',
                  backgroundColor: '#fafafa'
                }}>
                  <Text strong style={{ marginBottom: 8, display: 'block' }}>
                    {indexName}
                  </Text>
                  <TextArea
                    placeholder={`Describe the structure and fields of ${indexName} index...`}
                    value={localDescriptions[indexName] || ''}
                    onChange={(e) => handleDescriptionChange(indexName, e.target.value)}
                    rows={3}
                    style={{ fontSize: '12px' }}
                  />
                </div>
              ))}
            </Space>
          ) : (
                        <Text style={{ color: '#666666', fontStyle: 'italic' }}>
              Please select indexes first to configure their descriptions.
            </Text>
          )}
        </div>
      </Space>
    </Modal>
  );
};

// 可编辑的解析结果项组件
const EditableParseItem = ({ originalKey, info, onEdit, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [key, setKey] = useState(originalKey);
  const [description, setDescription] = useState(info.description || '');

  const handleSave = () => {
    if (key.trim()) {
      onEdit(originalKey, key.trim(), description);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setKey(originalKey);
    setDescription(info.description || '');
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(originalKey);
  };

  if (isEditing) {
    return (
      <Card size="small" style={{ marginBottom: 8 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong style={{ marginBottom: 4, display: 'block' }}>Key:</Text>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter field key"
            />
          </div>
          <div>
            <Text strong style={{ marginBottom: 4, display: 'block' }}>Description:</Text>
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter field description"
              rows={2}
            />
          </div>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button size="small" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="small" type="primary" onClick={handleSave}>
                Save
              </Button>
            </Space>
          </div>
        </Space>
      </Card>
    );
  }

  return (
    <Card size="small" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <Text strong>{key}</Text>
          <br />
          <Text style={{ color: '#666666' }}>{description}</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Space>
            <Button size="small" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
            <Button size="small" danger onClick={handleDelete}>
              Delete
            </Button>
          </Space>
        </div>
      </div>
    </Card>
  );
};

const NaturalLanguagePanel = ({ documents, onRowClick, projectInfo }) => {
  const getApiUrl = useApiUrl();
  const { message } = App.useApp();
  
  const [query, setQuery] = useState('what the age and team of Jay Fletcher Vincent?');
  const [model, setModel] = useState('gpt-4o');
  const [isProcessing, setIsProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadModalVisible, setLoadModalVisible] = useState(false);
  const [savedConversations, setSavedConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  
  // SSE 相关状态
  const [processingStatus, setProcessingStatus] = useState('');
  const [sseConnections, setSseConnections] = useState({}); // 管理多个SSE连接
  const [activeTasks, setActiveTasks] = useState({}); // 跟踪活跃任务
  
  // 索引相关状态
  const [indexConfigVisible, setIndexConfigVisible] = useState(false);
  const [selectedIndexes, setSelectedIndexes] = useState([]); // 默认选择 player
  const [availableIndexes, setAvailableIndexes] = useState([]);
  const [loadingIndexes, setLoadingIndexes] = useState(false);
  const [indexDescriptions, setIndexDescriptions] = useState(); // 默认描述
  
  // 分步流程状态
  const [currentStep, setCurrentStep] = useState(null); // 'parse', 'plan', 'execute', null
  const [currentQuery, setCurrentQuery] = useState(''); // 当前正在处理的查询
  const [parseResult, setParseResult] = useState(null); // parse阶段结果
  const [editableParseResult, setEditableParseResult] = useState(null); // 可编辑的parse结果
  const [planList, setPlanList] = useState([]); // plan阶段结果
  const [selectedPlan, setSelectedPlan] = useState(null); // 选中的执行计划
  
  const conversationEndRef = useRef(null);
  const [conversations, setConversations] = useState([
    {
      id: 1,
      type: 'user',
      content: 'I want to know some information about NBA players',
      timestamp: new Date(Date.now()).toLocaleTimeString()
    },
    {
      id: 2,
      type: 'assistant',
      content: 'I found that your document contains information about several NBA players.',
      output: JSON.stringify({
        columns: ['document_name', 'player_type', '_source_document_name'],
        data: [
          ['Aaron_Williams.txt', 'NBA Player'],
          ['Andre_Drummond.txt', 'NBA Player'],
          ['Angelo_Russell.txt', 'NBA Player']
        ],
        index: [0, 1, 2]
      }),
      timestamp: new Date(Date.now()).toLocaleTimeString(),
      relatedDocs: ['Aaron_Williams.txt', 'Andre_Drummond.txt', 'Angelo_Russell.txt']
    }
  ]);

  // 获取可用索引列表
  const fetchIndexes = async () => {
    setLoadingIndexes(true);
    try {
    const response = await fetch(getApiUrl('/api/indexes'));
      if (!response.ok) {
        throw new Error("HTTP error!");
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
  };

  // 组件挂载时获取索引列表
  useEffect(() => {
    fetchIndexes();
  }, []);

  // 组件卸载时关闭所有SSE连接
  useEffect(() => {
    return () => {
      Object.values(sseConnections).forEach(connection => {
        if (connection) {
          connection.close();
        }
      });
    };
  }, [sseConnections]);

  // 停止当前处理
  const handleStopProcessing = () => {
    // 关闭所有活跃的SSE连接
    Object.values(sseConnections).forEach(connection => {
      if (connection) {
        connection.close();
      }
    });
    
    // 清理状态
    setSseConnections({});
    setActiveTasks({});
    setIsProcessing(false);
    setProcessingStatus('');
    setCurrentStep(null);
    setCurrentQuery('');
    setParseResult(null);
    setEditableParseResult(null);
    setPlanList([]);
    setSelectedPlan(null);
    
    message.info('Processing stopped by user');
  };


  const handleSendMessage = async () => {
    if (!query.trim()) {
      message.warning('Please enter your question.');
      return;
    }



    // 保存当前查询，避免状态更新时序问题
    const currentQueryText = query.trim();

    // 添加用户消息到对话记录
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: currentQueryText,
      timestamp: new Date().toLocaleTimeString()
    };

    setConversations(prev => [...prev, userMessage]);
    setCurrentQuery(currentQueryText);
    setQuery('');
    setIsProcessing(true);
    
    // 开始第一步：解析自然语言
    await startParseStep(currentQueryText);
  };

  const startParseStep = async (queryText) => {
    try {
      setCurrentStep('parse');
      setProcessingStatus('Starting parse task...');

      // 第一步：启动任务
      const startResponse = await fetch(getApiUrl('/api/nl-parse-start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: queryText || currentQuery,
          index: selectedIndexes,
          desc: indexDescriptions 
        })
      });

      if (!startResponse.ok) {
        throw new Error(`Parse start failed: ${startResponse.status}`);
      }

      const { task_id } = await startResponse.json();
      
      // 第二步：监听进度事件
      const eventSource = new EventSource(getApiUrl(`/api/nl-parse-events/${task_id}`));
      
      // 保存连接引用
      setSseConnections(prev => ({ ...prev, parse: eventSource }));
      setActiveTasks(prev => ({ ...prev, parse: task_id }));
      
      setProcessingStatus('Parsing natural language query...');

      eventSource.addEventListener('progress', (event) => {
        const snap = JSON.parse(event.data);
        setProcessingStatus(snap.description || 'Parsing...');
        
        // 如果有日志更新，可以显示
        if (snap.logs && snap.logs.length > 0) {
          console.log('Parse logs:', snap.logs);
        }
      });

      eventSource.addEventListener('complete', (event) => {
        const snap = JSON.parse(event.data);
        console.log('Parse complete:', snap.result);
        if (snap.result) {
          setParseResult(snap.result);
          setEditableParseResult(JSON.parse(JSON.stringify(snap.result)));
          setIsProcessing(false);
          setProcessingStatus('');
        } else {
          throw new Error('Parse completed but no result received');
        }
        
        // 关闭连接
        eventSource.close();
        setSseConnections(prev => ({ ...prev, parse: null }));
        setActiveTasks(prev => ({ ...prev, parse: null }));
      });

      eventSource.addEventListener('error', (event) => {
        console.error('Parse SSE error:', event);
        eventSource.close();
        setSseConnections(prev => ({ ...prev, parse: null }));
        setActiveTasks(prev => ({ ...prev, parse: null }));
        
        setIsProcessing(false);
        setProcessingStatus('');
        setCurrentStep(null);
        setEditableParseResult(null);
        message.error('Parse failed: SSE connection error');
      });

    } catch (error) {
      console.error('Parse step failed:', error);
      setIsProcessing(false);
      setProcessingStatus('');
      setCurrentStep(null);
      setEditableParseResult(null);
      message.error('Parse failed: ' + error.message);
    }
  };

  const startPlanStep = async (modifiedParseResult) => {
    try {
      setIsProcessing(true);
      setCurrentStep('plan');
      setProcessingStatus('Starting plan generation task...');

      // 将修改后的parse结果转换为对话记录
      const parseMessage = {
        id: Date.now(),
        type: 'assistant',
        content: 'I have analyzed your query and identified the following operators:',
        parseResult: modifiedParseResult,
        timestamp: new Date().toLocaleTimeString()
      };
      setConversations(prev => [...prev, parseMessage]);
      console.log('Starting plan step with parse result:', modifiedParseResult);
      // 第一步：启动任务
  const startResponse = await fetch(getApiUrl('/api/nl-plan-start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_result: modifiedParseResult })
      });

      if (!startResponse.ok) {
        throw new Error(`Plan start failed: ${startResponse.status}`);
      }

      const { task_id } = await startResponse.json();
      
      // 第二步：监听进度事件
  const eventSource = new EventSource(getApiUrl(`/api/nl-plan-events/${task_id}`));
      
      // 保存连接引用
      setSseConnections(prev => ({ ...prev, plan: eventSource }));
      setActiveTasks(prev => ({ ...prev, plan: task_id }));
      
      setProcessingStatus('Generating execution plans...');

      eventSource.addEventListener('progress', (event) => {
        const snap = JSON.parse(event.data);
        setProcessingStatus(snap.description || 'Generating plans...');
        
        if (snap.logs && snap.logs.length > 0) {
          console.log('Plan logs:', snap.logs);
        }
      });

      eventSource.addEventListener('complete', (event) => {
        const snap = JSON.parse(event.data);
        console.log('Plan complete event:', snap);
        
        if (snap.result && snap.result.plan_list) {
          setPlanList(snap.result.plan_list);
          setIsProcessing(false);
          setProcessingStatus('');
        } else if (snap.result && Array.isArray(snap.result)) {
          // 如果直接返回数组
          setPlanList(snap.result);
          setIsProcessing(false);
          setProcessingStatus('');
        } else {
          console.error('Plan completed but no valid result received:', snap);
          throw new Error('Plan completed but no result received');
        }
        
        // 关闭连接
        eventSource.close();
        setSseConnections(prev => ({ ...prev, plan: null }));
        setActiveTasks(prev => ({ ...prev, plan: null }));
      });

      eventSource.addEventListener('error', (event) => {
        console.error('Plan SSE error:', event);
        eventSource.close();
        setSseConnections(prev => ({ ...prev, plan: null }));
        setActiveTasks(prev => ({ ...prev, plan: null }));
        
        setIsProcessing(false);
        setProcessingStatus('');
        setCurrentStep(null);
        setEditableParseResult(null);
        message.error('Plan generation failed: SSE connection error');
      });

    } catch (error) {
      console.error('Plan step failed:', error);
      setIsProcessing(false);
      setProcessingStatus('');
      setCurrentStep(null);
      setEditableParseResult(null);
      message.error('Plan generation failed: ' + error.message);
    }
  };

  // 处理解析结果编辑
  const handleEditParseResult = (oldKey, newKey, newDescription) => {
    setEditableParseResult(prev => {
      const newResult = { ...prev };
      if (!newResult.Extract) newResult.Extract = {};
      
      // 如果key发生变化，需要保持原有顺序
      if (oldKey !== newKey && newResult.Extract[oldKey]) {
        // 创建一个新的对象来保持顺序
        const newExtract = {};
        
        // 遍历原对象，替换对应的key
        Object.entries(newResult.Extract).forEach(([key, value]) => {
          if (key === oldKey) {
            // 用新key替换旧key，但保持位置不变
            newExtract[newKey] = {
              description: newDescription,
              required: true,
              field_type: value.field_type || 'string'
            };
          } else {
            newExtract[key] = value;
          }
        });
        
        newResult.Extract = newExtract;
      } else {
        // 如果key没有变化，只更新描述
        newResult.Extract[newKey] = {
          description: newDescription,
          required: true, // 既然保留的都是需要的，默认设为true
          field_type: prev.Extract?.[oldKey]?.field_type || 'string'
        };
      }
      
      return newResult;
    });
  };

  // 删除解析结果条目
  const handleDeleteParseItem = (key) => {
    setEditableParseResult(prev => {
      const newResult = { ...prev };
      if (newResult.Extract && newResult.Extract[key]) {
        delete newResult.Extract[key];
      }
      return newResult;
    });
  };

  // 保存编辑后的解析结果
  const handleSaveEditedParseResult = () => {
    if (!editableParseResult) return;
    
    // 直接使用编辑后的结果，用户已经通过Delete按钮删除了不需要的条目
    setParseResult(editableParseResult);
    startPlanStep(editableParseResult);
  };

  const startExecuteStep = async (selectedPlan) => {
    try {
      setIsProcessing(true);
      setCurrentStep('execute');
      setProcessingStatus('Starting execution task...');

      // 将选择的计划转换为对话记录
      const planMessage = {
        id: Date.now(),
        type: 'assistant',
        content: `I will execute the selected plan with ${Array.isArray(selectedPlan) ? selectedPlan.length : 0} steps`,
        selectedPlan: selectedPlan,
        timestamp: new Date().toLocaleTimeString()
      };
      setConversations(prev => [...prev, planMessage]);

      // 第一步：启动任务
      const startResponse = await fetch(getApiUrl('/api/nl-execute-start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          analysis_result: parseResult,
          selected_plan: selectedPlan 
        })
      });

      if (!startResponse.ok) {
        throw new Error(`Execution start failed: ${startResponse.status}`);
      }

      const { task_id } = await startResponse.json();
      
      // 第二步：监听进度事件
      const eventSource = new EventSource(getApiUrl(`/api/nl-execute-events/${task_id}`));
      
      // 保存连接引用
      setSseConnections(prev => ({ ...prev, execute: eventSource }));
      setActiveTasks(prev => ({ ...prev, execute: task_id }));
      
      setProcessingStatus('Executing selected plan...');

      eventSource.addEventListener('progress', (event) => {
        const snap = JSON.parse(event.data);
        setProcessingStatus(snap.description || 'Executing...');
        
        if (snap.logs && snap.logs.length > 0) {
          console.log('Execute logs:', snap.logs);
        }
      });

      eventSource.addEventListener('complete', (event) => {
        const snap = JSON.parse(event.data);
        console.log('Execute complete event:', snap);
        
        if (snap.result ) {
          // 处理执行结果数据
          let outputData = snap.result;
          let relatedDocs = [];
          
          // 如果结果包含 result_data，使用它
          if (snap.result.result_data) {
            outputData = snap.result.result_data;
            relatedDocs = snap.result.result_data.doc || [];
          }
          
          // 添加执行结果到对话记录
          const resultMessage = {
            id: Date.now() + 1,
            type: 'assistant',
            content: 'Here are the results from executing your query:',
            output: JSON.stringify(outputData),
            timestamp: new Date().toLocaleTimeString(),
            relatedDocs: relatedDocs
          };
          
          setConversations(prev => [...prev, resultMessage]);
          
          // 重置所有状态，准备下一个查询
          setCurrentStep(null);
          setCurrentQuery('');
          setParseResult(null);
          setEditableParseResult(null);
          setPlanList([]);
          setSelectedPlan(null);
          setIsProcessing(false);
          setProcessingStatus('');
        } else {
          throw new Error('Execution completed but no result received');
        }
        
        // 关闭连接
        eventSource.close();
        setSseConnections(prev => ({ ...prev, execute: null }));
        setActiveTasks(prev => ({ ...prev, execute: null }));
      });

      eventSource.addEventListener('error', (event) => {
        console.error('Execute SSE error:', event);
        eventSource.close();
        setSseConnections(prev => ({ ...prev, execute: null }));
        setActiveTasks(prev => ({ ...prev, execute: null }));
        
        setIsProcessing(false);
        setProcessingStatus('');
        setCurrentStep(null);
        setEditableParseResult(null);
        message.error('Execution failed: SSE connection error');
      });

    } catch (error) {
      console.error('Execute step failed:', error);
      setIsProcessing(false);
      setProcessingStatus('');
      setCurrentStep(null);
      setEditableParseResult(null);
      message.error('Execution failed: ' + error.message);
    }
  };

  // 自动滚动到底部
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, isProcessing]);

  // 处理索引配置
  const handleIndexConfig = () => {
    setIndexConfigVisible(true);
  };

  // 保存索引配置
  const handleSaveIndexConfig = async(selectedIndexIds, descriptions) => {
    setSelectedIndexes(selectedIndexIds);
    setIndexDescriptions(descriptions);
    setIndexConfigVisible(false);
    const response = await fetch(getApiUrl('/api/save-nl-index'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        selected_indexes: selectedIndexIds
      })
    });
    message.success(`indexes saved successfully (${selectedIndexIds.length} indexes)`);
  };



  const handleDocumentClick = (docName) => {
    const targetDoc = documents.find(doc => 
      doc.name === docName || 
      doc.name === docName + '.txt' || 
      doc.name.replace(/\.(txt|pdf)$/i, '') === docName
    );
    
    if (targetDoc && onRowClick) {
      onRowClick({ document_name: docName }, 'document_name');
    } else {
      message.info(`点击查看文档: ${docName}`);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const conversationData = {
        conversations,
        model,
        selectedIndexes,
        indexDescriptions,
        timestamp: new Date().toLocaleString("sv-SE").replace(" ", "T")
      };
      
  const response = await fetch(getApiUrl('/api/save-conversation'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(conversationData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Conversation saved:', result);
      
      message.success(`Conversation Saved successfully! file: ${result.filename || 'unknown'}`);

    } catch (error) {
      console.error('保存对话记录失败:', error);
      message.error('保存对话记录失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // 获取已保存的对话记录列表
  const fetchSavedConversations = async () => {
    try {
      setLoadingConversations(true);
  const response = await fetch(getApiUrl('/api/conversations'));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const conversations = await response.json();
      setSavedConversations(conversations);
    } catch (error) {
      console.error('获取对话记录列表失败:', error);
      message.error('获取对话记录列表失败: ' + error.message);
    } finally {
      setLoadingConversations(false);
    }
  };

  // 加载指定的对话记录
  const loadConversation = async (filename) => {
    try {
  const response = await fetch(getApiUrl(`/api/conversations/${filename}`));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const conversationData = await response.json();
      
      if (conversationData.conversations) {
        setConversations(conversationData.conversations);
        setSelectedIndexes(conversationData.selectedIndexes);
        setIndexDescriptions(conversationData.indexDescriptions);
        setModel(conversationData.model || 'gpt-4o');
        message.success(`"${filename}" load successfully！`);
        setLoadModalVisible(false);
      } else {
        message.error('对话记录数据格式错误');
      }
    } catch (error) {
      console.error('加载对话记录失败:', error);
      message.error('加载对话记录失败: ' + error.message);
    }
  };

  // 删除对话记录
  const deleteConversation = async (filename) => {
    try {
  const response = await fetch(getApiUrl(`/api/conversations/${filename}`), {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      message.success(`对话记录 "${filename}" delete successfully！`);
      fetchSavedConversations(); // 重新获取列表
    } catch (error) {
      console.error('删除对话记录失败:', error);
      message.error('删除对话记录失败: ' + error.message);
    }
  };

  // 显示加载对话记录对话框
  const handleLoadConversation = () => {
    setLoadModalVisible(true);
    fetchSavedConversations();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSendMessage();
    }
  };

  return (
    <div className="nl-section">
      <style jsx>{`
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(1.02); }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 10px rgba(34, 197, 94, 0.3); }
          50% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.5), 0 0 30px rgba(34, 197, 94, 0.3); }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .conversation-message {
          margin-bottom: 20px;
          padding: 0;
          border: none;
          border-radius: 16px;
          background: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          transition: all 0.2s ease;
        }
        
        .conversation-message:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }
        
        .user-message {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%);
          border: 1px solid rgba(59, 130, 246, 0.1);
        }
        
        .assistant-message {
          background: rgba(249, 250, 251, 0.8);
          border: 1px solid rgba(229, 231, 235, 0.5);
        }
      `}</style>
      <div className="nl-header">
        <div>
          <Title level={4}>
            <MessageOutlined style={{ marginRight: 8 }} />
            Natural Language Interface
          </Title>
          <Text style={{ color: '#666666' }}>Use natural language processing documents</Text>
        </div>

        <Space>
          <Button 
            size="small"
            icon={<DatabaseOutlined />}
            onClick={handleIndexConfig}
          >
            Indexes
            {selectedIndexes.length > 0 && (
              <Badge 
                count={selectedIndexes.length} 
                size="small" 
                style={{ marginLeft: 4 }}
              />
            )}
          </Button>
          <Button
            size="small"
            icon={<FolderOpenOutlined />}
            onClick={handleLoadConversation}
          >
            Load
          </Button>
          <Button 
            size="small"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
          >
            Save
          </Button>
          <Select
            value={model}
            onChange={setModel}
            style={{ width: 120 }}
            size="small"
          >
            <Option value="gpt-4o">GPT-4o</Option>
            <Option value="gpt-4.1">GPT-4.1</Option>
            <Option value="claude">Claude</Option>
          </Select>
          </Space>

      </div>

      <div className="nl-content" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        gap: '20px',
        padding: '20px',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(249, 250, 251, 0.8) 100%)',
        borderRadius: '20px'
      }}>
        {/* 对话历史区域 */}
        <div style={{ 
          flex: 1,
          overflowY: 'auto',
          paddingRight: '12px',
          minHeight: 0,
          
          padding: '20px 20px 20px 0'
        }}>
          {conversations.map((item) => (
            <div 
              key={item.id} 
              className={`conversation-message ${
                item.type === 'user' ? 'user-message' : 'assistant-message'
              }`}
              style={{ padding: '20px' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <Avatar 
                  icon={item.type === 'user' ? <UserOutlined /> : <RobotOutlined />}
                  size={40}
                  style={{ 
                    background: item.type === 'user' 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                      : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    border: 'none',
                    boxShadow: item.type === 'user' 
                      ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                      : '0 4px 12px rgba(22, 163, 74, 0.3)',
                    flexShrink: 0
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ marginBottom: '12px' }}>
                    <Space align="center">
                      <Text strong style={{ 
                        fontSize: '15px',
                        color: item.type === 'user' ? '#3b82f6' : '#16a34a',
                        fontWeight: '600'
                      }}>
                        {item.type === 'user' ? 'You' : 'Assistant'}
                      </Text>
                      <div style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        backgroundColor: '#d1d5db'
                      }} />
                      <Text style={{ color: '#6b7280', fontSize: '13px', fontWeight: '500' }}>
                        {item.timestamp}
                      </Text>
                    </Space>
                  </div>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <Text style={{ 
                      whiteSpace: 'pre-wrap', 
                      wordBreak: 'break-word',
                      display: 'block',
                      fontSize: '15px',
                      lineHeight: '1.6',
                      color: '#1f2937'
                    }}>
                      {item.content}
                    </Text>
                  </div>
                  
                  {/* Parse结果显示 */}
                  {item.type === 'assistant' && item.parseResult && (
                    <Collapse size="small" style={{ marginTop: 8 }}>
                      <Panel header="Parse Results" key="parseResult">
                        <div>
                          {Object.entries(item.parseResult.Extract || {}).map(([key, info]) => (
                            <Card key={key} size="small" style={{ marginBottom: 8 }}>
                              <div>
                                <Text strong>{key}</Text>: <Text>{info.description}</Text>
                                <br />

                              </div>
                            </Card>
                          ))}
                        </div>
                      </Panel>
                    </Collapse>
                  )}

                  {/* 选中的执行计划显示 */}
                  {item.type === 'assistant' && item.selectedPlan && (
                    <Collapse size="small" style={{ marginTop: 8 }}>
                      <Panel header="Selected Execution Plan" key="selectedPlan">
                        <Card size="small">
                          <div>
                            <Text strong>Selected Plan</Text>
                            <div style={{ marginTop: 8 }}>
                              <Text style={{ color: '#666666' }}>Steps:</Text>
                              {Array.isArray(item.selectedPlan) ? (
                                <div style={{ marginTop: 4 }}>
                                  {item.selectedPlan.map((step, index) => (
                                    <div key={index} style={{ marginBottom: 6, paddingLeft: 12 }}>
                                      <Text strong style={{ fontSize: '13px' }}>{step.name}:</Text>
                                      <br />
                                      <Text style={{ color: '#666666', fontSize: '12px' }}>
                                        {step.description}
                                      </Text>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ marginTop: 4 }}>
                                  <Text style={{ color: '#666666' }}>No steps available</Text>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      </Panel>
                    </Collapse>
                  )}

                  {/* AI助手的表格输出 */}
                  {item.type === 'assistant' && item.output && (
                    <Collapse size="small" style={{ marginTop: 8 }}>
                      <Panel header="Output Result" key="1">
                        <div style={{ overflow: 'auto', maxWidth: '100%' }}>
                          {(() => {
                            // 尝试解析为表格数据
                            try {
                              const data = JSON.parse(item.output);
                              if (Array.isArray(data?.columns) && Array.isArray(data?.data)) {
                                // 过滤掉以 _ 开头的内部字段
                                const visibleKeys = data.columns.filter(key => !key.startsWith('_'));
                                const columns = visibleKeys.map(key => ({
                                  title: key,
                                  dataIndex: key,
                                  key: key,
                                  width: 120,
                                  ellipsis: true,
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
                                    scroll={{ x: true }}
                                    style={{ maxWidth: '100%' }}
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
                                      style: { 
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                      },
                                      onMouseEnter: (event) => {
                                        const row = event.currentTarget;
                                        row.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.06) 0%, rgba(147, 51, 234, 0.04) 100%)';
                                        row.style.transform = 'translateY(-1px)';
                                        row.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.15)';
                                      },
                                      onMouseLeave: (event) => {
                                        const row = event.currentTarget;
                                        row.style.background = '';
                                        row.style.transform = 'translateY(0)';
                                        row.style.boxShadow = '';
                                      }
                                    })}
                                  />
                                );
                              }
                            } catch (e) {
                              // 如果不是 JSON 或不是表格格式，就显示原始文本
                            }
                            
                            // 默认显示文本
                            return <Text code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.output}</Text>;
                          })()}
                        </div>
                      </Panel>
                    </Collapse>
                  )}
                  
                  {item.relatedDocs && (
                    <div style={{ marginTop: 8 }}>
                      <Text style={{ color: '#666666', fontSize: '12px' }}>
                        Related documents: 
                      </Text>
                      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {item.relatedDocs.map(doc => (
                          <Tag 
                            key={doc}
                            style={{ 
                              margin: 0,
                              cursor: 'pointer',
                              borderRadius: '8px',
                              border: '1px solid #3b82f6',
                              background: 'rgba(59, 130, 246, 0.08)',
                              color: '#3b82f6',
                              fontWeight: '600',
                              padding: '4px 12px',
                              fontSize: '13px',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              boxShadow: '0 1px 3px rgba(59, 130, 246, 0.1)'
                            }}
                            onClick={() => handleDocumentClick(doc)}
                            onMouseEnter={(e) => {
                              e.target.style.background = 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)';
                              e.target.style.color = 'white';
                              e.target.style.transform = 'translateY(-2px) scale(1.05)';
                              e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                              e.target.style.borderColor = '#3b82f6';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = 'rgba(59, 130, 246, 0.08)';
                              e.target.style.color = '#3b82f6';
                              e.target.style.transform = 'translateY(0) scale(1)';
                              e.target.style.boxShadow = '0 1px 3px rgba(59, 130, 246, 0.1)';
                              e.target.style.borderColor = '#3b82f6';
                            }}
                          >
                            {doc}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {/* 步骤显示区域 - 只在有内容且不在处理中时显示 */}
          {currentStep && !isProcessing && (
            <div style={{ 
              padding: '20px',
              border: 'none',
              borderRadius: '12px',
              backgroundColor: 'rgba(22, 163, 74, 0.05)',
              marginBottom: '20px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <Avatar 
                  icon={<RobotOutlined />}
                  size={40}
                  style={{ 
                    backgroundColor: '#16a34a', 
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)'
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Parse 阶段显示 */}
                  {currentStep === 'parse' && editableParseResult && (
                    <div>
                      <Text strong style={{ fontSize: '16px', color: '#1f2937' }}>Parse Results - Please review and modify if needed:</Text>
                      <div style={{ marginTop: 16 }}>
                        {Object.entries(editableParseResult.Extract || {}).map(([key, info]) => (
                          <EditableParseItem
                            key={key}
                            originalKey={key}
                            info={info}
                            onEdit={handleEditParseResult}
                            onDelete={handleDeleteParseItem}
                          />
                        ))}
                      </div>
                      <div style={{ marginTop: 20, textAlign: 'right' }}>
                        <Button 
                          type="primary" 
                          size="large"
                          onClick={handleSaveEditedParseResult}
                          style={{
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
                          }}
                        >
                          Continue to Plan Generation
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Plan 阶段显示 */}
                  {currentStep === 'plan' && planList.length > 0 && (
                    <div>
                      <div style={{ marginBottom: 20 }}>
                        <Text strong style={{ 
                          fontSize: '18px', 
                          color: '#1f2937',
                          display: 'block',
                          marginBottom: '8px'
                        }}>Available Execution Plans</Text>
                        <Text style={{ 
                          color: '#6b7280', 
                          fontSize: '14px',
                          fontWeight: '500'
                        }}>Choose the plan that best fits your requirements</Text>
                      </div>
                      
                      <div style={{ marginTop: 20 }}>
                        <Radio.Group 
                          onChange={(e) => setSelectedPlan(planList[parseInt(e.target.value)])}
                          value={selectedPlan ? planList.indexOf(selectedPlan) : undefined}
                          style={{ width: '100%' }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {planList.map((plan, planIndex) => {
                              const isSelected = selectedPlan && planList.indexOf(selectedPlan) === planIndex;
                              return (
                                <div 
                                  key={planIndex}
                                  style={{
                                    position: 'relative',
                                    borderRadius: '16px',
                                    border: isSelected 
                                      ? '2px solid rgba(34, 197, 94, 0.5)' 
                                      : '2px solid rgba(229, 231, 235, 0.6)',
                                    background: isSelected 
                                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(21, 128, 61, 0.06) 100%)'
                                      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 251, 0.95) 100%)',
                                    padding: '24px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: isSelected 
                                      ? '0 8px 25px rgba(34, 197, 94, 0.15), 0 3px 10px rgba(34, 197, 94, 0.1)'
                                      : '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)',
                                    transform: isSelected ? 'translateY(-2px)' : 'translateY(0)',
                                    overflow: 'hidden'
                                  }}
                                  onClick={() => setSelectedPlan(plan)}
                                  onMouseEnter={(e) => {
                                    if (!isSelected) {
                                      e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
                                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.06)';
                                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(147, 51, 234, 0.02) 100%)';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSelected) {
                                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)';
                                      e.currentTarget.style.borderColor = 'rgba(229, 231, 235, 0.6)';
                                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 251, 0.95) 100%)';
                                    }
                                  }}
                                >
                                  {/* 选中指示器 - 简化版本 */}
                                  {isSelected && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '-2px',
                                      left: '-2px',
                                      right: '-2px',
                                      bottom: '-2px',
                                      borderRadius: '18px',
                                      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(21, 128, 61, 0.08) 100%)',
                                      zIndex: -1
                                    }} />
                                  )}
                                  
                                  {/* Radio 按钮 - 简化处理 */}
                                  <Radio value={planIndex} style={{ 
                                    position: 'absolute', 
                                    top: '20px', 
                                    right: '0px'
                                  }}>
                                    <span style={{ display: 'none' }}>Select</span>
                                  </Radio>
                                  
                                  {/* 计划标题 */}
                                  <div style={{ marginBottom: '16px', paddingRight: '40px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                      <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        background: isSelected 
                                          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.6) 0%, rgba(21, 128, 61, 0.5) 100%)'
                                          : 'linear-gradient(135deg, rgba(156, 163, 175, 0.4) 0%, rgba(107, 114, 128, 0.3) 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: '700',
                                        fontSize: '14px',
                                        boxShadow: isSelected 
                                          ? '0 1px 6px rgba(34, 197, 94, 0.1)'
                                          : '0 1px 3px rgba(156, 163, 175, 0.1)'
                                      }}>
                                        {planIndex + 1}
                                      </div>
                                      <Text strong style={{ 
                                        fontSize: '16px', 
                                        color: isSelected ? 'rgba(1, 70, 51, 0.7)' : 'rgba(12, 14, 17, 0.7)',
                                        fontWeight: '600'
                                      }}>Plan {planIndex + 1}</Text>
                                    </div>
                                  </div>
                                  
                                  {/* 计划步骤 */}
                                  <div style={{ paddingLeft: '0px' }}>
                                    {Array.isArray(plan) && plan.map((step, stepIndex) => (
                                      <div key={stepIndex} style={{ 
                                        marginBottom: stepIndex === plan.length - 1 ? 0 : '16px',
                                        padding: '16px 20px',
                                        backgroundColor: isSelected 
                                          ? 'rgba(34, 197, 94, 0.04)'
                                          : 'rgba(255, 255, 255, 0.8)',
                                        borderRadius: '12px',
                                        border: '2px solid ' + (isSelected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(243, 244, 246, 0.8)'),
                                        position: 'relative',
                                        transition: 'all 0.2s ease',
                                        boxShadow: isSelected 
                                          ? '0 2px 8px rgba(34, 197, 94, 0.08)'
                                          : '0 1px 3px rgba(0, 0, 0, 0.05)'
                                      }}>
                                        {/* 步骤数字 */}
                                        <div style={{
                                          position: 'absolute',
                                          left: '-10px',
                                          top: '16px',
                                          width: '24px',
                                          height: '24px',
                                          borderRadius: '50%',
                                          background: isSelected 
                                            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' 
                                            : 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
                                          color: 'white',
                                          fontSize: '12px',
                                          fontWeight: '700',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          boxShadow: isSelected 
                                            ? '0 2px 6px rgba(34, 197, 94, 0.3)'
                                            : '0 1px 3px rgba(156, 163, 175, 0.3)',
                                          border: '2px solid white'
                                        }}>
                                          {stepIndex + 1}
                                        </div>
                                        
                                        <div style={{ marginLeft: '16px' }}>
                                          <Text strong style={{ 
                                            fontSize: '14px', 
                                            color: isSelected ? 'rgba(1, 5, 4, 0.75)' : 'rgba(0, 0, 0, 0.75)',
                                            display: 'block',
                                            marginBottom: '4px',
                                            fontWeight: '600'
                                          }}>{step.name}</Text>
                                          <Text style={{ 
                                            color: isSelected ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.6)', 
                                            fontSize: '13px',
                                            lineHeight: '1.5',
                                            fontWeight: '400'
                                          }}>
                                            {step.description}
                                          </Text>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </Radio.Group>
                      </div>
                      <div style={{ 
                        marginTop: 32, 
                        display: 'flex', 
                        justifyContent: 'right',
                        paddingTop: '24px',
                        borderTop: '1px solid #f3f4f6'
                      }}>
                        <Button 
                          type="primary" 
                          size="large"
                          disabled={selectedPlan === null || selectedPlan === undefined}
                          onClick={() => startExecuteStep(selectedPlan)}
                          style={{
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
                          }}
                          onMouseEnter={(e) => {
                            if (selectedPlan) {
                              e.target.style.transform = 'translateY(-3px) scale(1.05)';
                              e.target.style.boxShadow = '0 8px 25px rgba(34, 197, 94, 0.4), 0 4px 12px rgba(34, 197, 94, 0.3)';
                              e.target.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedPlan) {
                              e.target.style.transform = 'translateY(0) scale(1)';
                              e.target.style.boxShadow = '0 4px 12px rgba(22, 163, 74, 0.3)';
                              e.target.style.background = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
                            }
                          }}
                        >
                          Execute Selected Plan
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 现代化的处理状态显示 */}
          {isProcessing && (
            <div style={{ 
              padding: '20px',
              border: 'none',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.06) 0%, rgba(249, 115, 22, 0.06) 100%)',
              marginBottom: '20px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* 动画背景 */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(251, 146, 60, 0.06), transparent)',
                animation: 'shimmer 2s infinite'
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <Avatar 
                    icon={<RobotOutlined />}
                    size={40}
                    style={{ 
                      background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.9) 0%, rgba(249, 115, 22, 0.9) 100%)',
                      border: 'none',
                      boxShadow: '0 3px 10px rgba(251, 146, 60, 0.3)'
                    }}
                  />
                  {/* 脉冲动画 */}
                  <div style={{
                    position: 'absolute',
                    top: '-2px',
                    left: '-2px',
                    right: '-2px',
                    bottom: '-2px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.6) 0%, rgba(249, 115, 22, 0.6) 100%)',
                    opacity: 0.2,
                    animation: 'pulse 2s infinite'
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <Text style={{ 
                    color: '#1f2937', 
                    fontWeight: '600',
                    fontSize: '16px',
                    display: 'block',
                    marginBottom: '4px'
                  }}>
                    {processingStatus || 'AI is thinking...'}
                  </Text>
                  <div style={{ 
                    height: '4px', 
                    backgroundColor: 'rgba(251, 146, 60, 0.12)', 
                    borderRadius: '2px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{
                      height: '100%',
                      width: '100%',
                      background: 'linear-gradient(90deg, rgba(251, 146, 60, 0.8), rgba(249, 115, 22, 0.8))',
                      borderRadius: '2px',
                      animation: 'loading 2s infinite'
                    }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 自动滚动锚点 */}
          <div ref={conversationEndRef} />
        </div>

        {/* 输入区域 */}
        <div style={{ 
          flexShrink: 0,
          padding: '24px',
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(249, 250, 251, 0.9) 100%)'
        }}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <TextArea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Please describe the information you want to know in natural language."
              rows={4}
              onKeyDown={handleKeyPress}
              style={{
                borderRadius: '12px',
                border: '2px solid #e5e7eb',
                fontSize: '15px',
                lineHeight: '1.6',
                padding: '16px',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.04), 0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.04)';
              }}
            />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ 
                color: '#6b7280', 
                fontSize: '13px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  padding: '4px 8px',
                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: 'rgba(59, 130, 246, 0.8)',
                  fontWeight: '600'
                }}>
                  Ctrl+Enter
                </span>
                to send quickly
              </Text>
              {isProcessing ? (
                <Button 
                  type="primary" 
                  danger
                  icon={<StopOutlined />}
                  onClick={handleStopProcessing}
                  size="large"
                  style={{
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                    fontSize: '15px',
                    fontWeight: '600',
                    height: '48px',
                    paddingLeft: '24px',
                    paddingRight: '24px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Stop Processing
                </Button>
              ) : (
                <Button 
                  type="primary" 
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  disabled={!query.trim()}
                  size="large"
                  style={{
                    borderRadius: '12px',
                    background: !query.trim() ? undefined : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    border: 'none',
                    boxShadow: !query.trim() ? undefined : '0 4px 12px rgba(59, 130, 246, 0.4)',
                    fontSize: '15px',
                    fontWeight: '600',
                    height: '48px',
                    paddingLeft: '24px',
                    paddingRight: '24px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Send Message
                </Button>
              )}
            </div>
          </Space>
        </div>
      </div>
      
      {/* Load Conversation Modal */}
      <Modal
        title="Load Saved Conversations"
        open={loadModalVisible}
        onCancel={() => setLoadModalVisible(false)}
        footer={null}
        width={600}
      >
        <List
          loading={loadingConversations}
          dataSource={savedConversations}
          renderItem={(conversationConfig) => (
            <List.Item
              actions={[
                <Button 
                  type="primary"
                  size="small"
                  onClick={() => loadConversation(conversationConfig.filename)}
                >
                  Load
                </Button>,
                <Button
                  danger
                  size="small"
                  onClick={() => {
                    Modal.confirm({
                      title: '确认删除',
                      content: `确定要删除对话记录 "${conversationConfig.name || conversationConfig.filename}" 吗？`,
                      onOk: () => deleteConversation(conversationConfig.filename)
                    });
                  }}
                >
                  Delete
                </Button>
              ]}
            >
              <List.Item.Meta
                title={conversationConfig.name || conversationConfig.filename}
                description={
                  <Space direction="vertical" size="small">
                    <Text style={{ color: '#666666' }}>
                      Modified time: {conversationConfig.modified_time}
                    </Text>
                    <Text style={{ color: '#666666' }}>
                      Model: {conversationConfig.model || 'Unknown'} | 
                      {conversationConfig.description || 'No description'}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: 'No saved conversations' }}  
        />
      </Modal>
      
      {/* 索引配置模态框 */}
      <IndexConfigModal
        visible={indexConfigVisible}
        onCancel={() => setIndexConfigVisible(false)}
        onSave={handleSaveIndexConfig}
        availableIndexes={availableIndexes}
        selectedIndexes={selectedIndexes}
        indexDescriptions={indexDescriptions}
        loading={loadingIndexes}
      />
    </div>
  );
};

export default NaturalLanguagePanel;
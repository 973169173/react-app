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
  SettingOutlined

} from '@ant-design/icons';

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
            <Text type="secondary" style={{ fontStyle: 'italic' }}>
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
          <Text type="secondary">{description}</Text>
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
        columns: ['document_name', 'player_type', 'status', '_source_document_name'],
        data: [
          ['Aaron_Williams.txt', 'NBA Player', 'Active'],
          ['Andre_Drummond.txt', 'NBA Player', 'Active'],
          ['Angelo_Russell.txt', 'NBA Player', 'Active']
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
      const response = await fetch('http://localhost:5000/api/indexes');
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
      const startResponse = await fetch('http://localhost:5000/api/nl-parse-start', {
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
      const eventSource = new EventSource(`http://localhost:5000/api/nl-parse-events/${task_id}`);
      
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
      const startResponse = await fetch('http://localhost:5000/api/nl-plan-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_result: modifiedParseResult })
      });

      if (!startResponse.ok) {
        throw new Error(`Plan start failed: ${startResponse.status}`);
      }

      const { task_id } = await startResponse.json();
      
      // 第二步：监听进度事件
      const eventSource = new EventSource(`http://localhost:5000/api/nl-plan-events/${task_id}`);
      
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
      const startResponse = await fetch('http://localhost:5000/api/nl-execute-start', {
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
      const eventSource = new EventSource(`http://localhost:5000/api/nl-execute-events/${task_id}`);
      
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
  const handleSaveIndexConfig = (selectedIndexIds, descriptions) => {
    setSelectedIndexes(selectedIndexIds);
    setIndexDescriptions(descriptions);
    setIndexConfigVisible(false);
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
      
      const response = await fetch('http://localhost:5000/api/save-conversation', {
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
      const response = await fetch('http://localhost:5000/api/conversations');
      
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
      const response = await fetch(`http://localhost:5000/api/conversations/${filename}`);
      
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
      const response = await fetch(`http://localhost:5000/api/conversations/${filename}`, {
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
      <div className="nl-header">
        <div>
          <Title level={4}>
            <MessageOutlined style={{ marginRight: 8 }} />
            Natural Language Interface
          </Title>
          <Text type="secondary">Use natural language processing documents</Text>
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
        gap: '16px'
      }}>
        {/* 对话历史区域 */}
        <div style={{ 
          flex: 1,
          overflowY: 'auto',
          paddingRight: '8px',
          minHeight: 0
        }}>
          {conversations.map((item) => (
            <div key={item.id} style={{ 
              marginBottom: '16px', 
              padding: '12px',
              border: '1px solid #f0f0f0',
              borderRadius: '8px',
              backgroundColor: item.type === 'user' ? '#f6ffed' : '#fff7e6'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Avatar 
                  icon={item.type === 'user' ? <UserOutlined /> : <RobotOutlined />}
                  style={{ 
                    backgroundColor: item.type === 'user' ? '#1890ff' : '#52c41a',
                    flexShrink: 0
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ marginBottom: '8px' }}>
                    <Space>
                      <Text strong>
                        {item.type === 'user' ? 'You' : 'Assistant'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {item.timestamp}
                      </Text>
                    </Space>
                  </div>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <Text style={{ 
                      whiteSpace: 'pre-wrap', 
                      wordBreak: 'break-word',
                      display: 'block'
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
                                <Text type="secondary">
                                  Type: {info.field_type}, Required: {info.required ? 'Yes' : 'No'}
                                </Text>
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
                              <Text type="secondary">Steps:</Text>
                              {Array.isArray(item.selectedPlan) ? (
                                <div style={{ marginTop: 4 }}>
                                  {item.selectedPlan.map((step, index) => (
                                    <div key={index} style={{ marginBottom: 6, paddingLeft: 12 }}>
                                      <Text strong style={{ fontSize: '13px' }}>{step.name}:</Text>
                                      <br />
                                      <Text type="secondary" style={{ fontSize: '12px' }}>
                                        {step.description}
                                      </Text>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ marginTop: 4 }}>
                                  <Text type="secondary">No steps available</Text>
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
                                      style: { cursor: 'pointer' }
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
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Related documents: 
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        {item.relatedDocs.map(doc => (
                          <Tag 
                            key={doc}
                            color="blue" 
                            style={{ margin: '2px', cursor: 'pointer' }}
                            onClick={() => handleDocumentClick(doc)}
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
          
          {/* 步骤显示区域 */}
          {currentStep && (
            <div style={{ 
              padding: '16px',
              border: '1px solid #f0f0f0',
              borderRadius: '8px',
              backgroundColor: '#f6ffed',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Avatar 
                  icon={<RobotOutlined />}
                  style={{ backgroundColor: '#52c41a', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Parse 阶段显示 */}
                  {currentStep === 'parse' && editableParseResult && (
                    <div>
                      <Text strong>Parse Results - Please review and modify if needed:</Text>
                      <div style={{ marginTop: 12 }}>
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
                      <div style={{ marginTop: 16, textAlign: 'right' }}>
                        <Button 
                          type="primary" 
                          onClick={handleSaveEditedParseResult}
                        >
                          Continue to Plan Generation
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Plan 阶段显示 */}
                  {currentStep === 'plan' && planList.length > 0 && (
                    <div>
                      <Text strong>Available Execution Plans - Please select one:</Text>
                      <div style={{ marginTop: 12 }}>
                        <Radio.Group 
                          onChange={(e) => setSelectedPlan(planList[parseInt(e.target.value)])}
                          value={selectedPlan ? planList.indexOf(selectedPlan) : undefined}
                        >
                          <Space direction="vertical" style={{ width: '100%' }}>
                            {planList.map((plan, planIndex) => (
                              <Radio key={planIndex} value={planIndex}>
                                <Card size="small" style={{ marginLeft: 8, width: 'calc(100% - 24px)' }}>
                                  <div>
                                    <Text strong>Plan {planIndex + 1}</Text>
                                    <div style={{ marginTop: 8 }}>
                                      {Array.isArray(plan) && plan.map((step, stepIndex) => (
                                        <div key={stepIndex} style={{ marginBottom: 8, paddingLeft: 16 }}>
                                          <Text strong style={{ fontSize: '13px' }}>{step.name}:</Text>
                                          <br />
                                          <Text type="secondary" style={{ fontSize: '12px' }}>
                                            {step.description}
                                          </Text>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </Card>
                              </Radio>
                            ))}
                          </Space>
                        </Radio.Group>
                      </div>
                      <div style={{ marginTop: 16, textAlign: 'right' }}>
                        <Button 
                          type="primary" 
                          disabled={selectedPlan === null || selectedPlan === undefined}
                          onClick={() => startExecuteStep(selectedPlan)}
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

          {isProcessing && (
            <div style={{ 
              textAlign: 'center', 
              padding: '16px',
              border: '1px solid #f0f0f0',
              borderRadius: '8px',
              backgroundColor: '#fff7e6',
              marginBottom: '16px'
            }}>
              <Avatar 
                icon={<RobotOutlined />}
                style={{ backgroundColor: '#52c41a', marginRight: 8 }}
              />
              <Text type="secondary">
                {processingStatus || 'AI is thinking...'}
              </Text>
            </div>
          )}
          
          {/* 自动滚动锚点 */}
          <div ref={conversationEndRef} />
        </div>

        {/* 输入区域 */}
        <div style={{ 
          flexShrink: 0,
          padding: '16px',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #f0f0f0'
        }}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <TextArea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Please describe the information you want to know in natural language."
              rows={4}
              onKeyDown={handleKeyPress}
            />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Press Ctrl/Cmd + Enter to send quickly
              </Text>
              <Button 
                type="primary" 
                icon={<SendOutlined />}
                onClick={handleSendMessage}
                loading={isProcessing}
                disabled={!query.trim()  }
              >
                {currentStep ? 'Processing...' : 'Send Message'}
              </Button>
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
                    <Text type="secondary">
                      Modified time: {conversationConfig.modified_time}
                    </Text>
                    <Text type="secondary">
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
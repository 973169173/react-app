import React, { useState, useEffect, useRef } from 'react';
import {Button, Input, Select, Space, Typography,  Avatar, Tag, Table, Collapse, Modal, List, App, Badge, Divider } from 'antd';
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

const NaturalLanguagePanel = ({ documents, onRowClick, projectInfo }) => {
  const { message } = App.useApp();
  
  const [query, setQuery] = useState('what the age and team of Jay Fletcher Vincent?');
  const [model, setModel] = useState('gpt-4o');
  const [isProcessing, setIsProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadModalVisible, setLoadModalVisible] = useState(false);
  const [savedConversations, setSavedConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  
  // 索引相关状态
  const [indexConfigVisible, setIndexConfigVisible] = useState(false);
  const [selectedIndexes, setSelectedIndexes] = useState([]); // 默认选择 player
  const [availableIndexes, setAvailableIndexes] = useState([]);
  const [loadingIndexes, setLoadingIndexes] = useState(false);
  const [indexDescriptions, setIndexDescriptions] = useState(); // 默认描述
  
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


  const handleSendMessage = async () => {
    if (!query.trim()) {
      message.warning('Please enter your question.');
      return;
    }

    if (selectedIndexes.length === 0) {
      message.warning('Please select at least one index.');
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString()
    };

    setConversations(prev => [...prev, userMessage]);
    setIsProcessing(true);
    setQuery('');

    try {
      // 构建请求参数
      const requestData = {
        index: selectedIndexes, // list
        query: query, // str
        desc: indexDescriptions, // dict
        model: model
      };

      console.log('Sending request with data:', requestData);

      const response = await fetch('http://localhost:5000/api/nl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reply = await response.json();

      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'Based on the analysis of the document you provided, I have obtained the following information:',
        output: JSON.stringify(reply),
        timestamp: new Date().toLocaleTimeString(),
        relatedDocs: reply.data?.doc || []
      };
      
      setConversations(prev => [...prev, assistantMessage]);
      setIsProcessing(false);

      
    } catch (error) {
      console.error('处理失败:', error);
      setIsProcessing(false);
      message.error('处理失败: ' + error.message);
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
              <Text type="secondary">AI is thinking...</Text>
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
            {/* 当前配置显示 */}
            {selectedIndexes.length > 0 && (
              <div style={{ 
                padding: '8px 12px', 
                backgroundColor: '#f6ffed', 
                borderRadius: '4px',
                border: '1px solid #b7eb8f'
              }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Selected Indexes: 
                </Text>
                <div style={{ marginTop: 4 }}>
                  {selectedIndexes.map(index => (
                    <Tag 
                      key={index}
                      color="green" 
                      style={{ margin: '2px' }}
                    >
                      {index}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

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
                disabled={!query.trim() || selectedIndexes.length === 0}
              >
                Send Message
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
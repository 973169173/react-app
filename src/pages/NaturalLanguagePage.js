import React, { useState, useEffect, useRef } from 'react';
import {Button, Input, Select, Space, Typography,  Avatar, Tag, Table, Collapse, Modal, List, App } from 'antd';
import { 
  SendOutlined,
  SaveOutlined,
  MessageOutlined,
  UserOutlined,
  RobotOutlined,
  FolderOpenOutlined

} from '@ant-design/icons';

const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;
const { Title, Text } = Typography;

const NaturalLanguagePanel = ({ documents, onRowClick }) => {
  const { message } = App.useApp();
  
  const [query, setQuery] = useState('Please help me find NBA players over 30 years old');
  const [model, setModel] = useState('gpt-4o');
  const [isProcessing, setIsProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadModalVisible, setLoadModalVisible] = useState(false);
  const [savedConversations, setSavedConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
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


  const handleSendMessage = async () => {
    if (!query.trim()) {
      message.warning('Please enter your question.');
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
      const response = await fetch('http://localhost:5000/api/nl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: query,
          model: model
        })
      });
      const reply = await response.json();


      
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'Based on the analysis of the document you provided, I have obtained the following information:',
        output: JSON.stringify(reply),
        timestamp: new Date().toLocaleTimeString(),
        relatedDocs: reply.data.doc
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
                disabled={!query.trim()}
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
    </div>
  );
};

export default NaturalLanguagePanel;
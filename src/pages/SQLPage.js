import React, { useEffect, useState } from 'react';
import { Card, Button, Input, Select, Space, Typography, Table, Divider, Modal, List, App } from 'antd';
import { 
  PlayCircleOutlined,
  SaveOutlined,
  DatabaseOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

const SQLPanel = ({ documents, onRowClick }) => {
  const { message } = App.useApp();
  
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM documents WHERE category = "research"');
  const [description, setDescription] = useState('Enter description');
  const [model, setModel] = useState('gpt-4o');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadModalVisible, setLoadModalVisible] = useState(false);
  const [savedSQLs, setSavedSQLs] = useState([]);
  const [loadingSQLs, setLoadingSQLs] = useState(false);

  useEffect(() => {
    // 页面加载时不自动获取最新SQL数据
    // 用户可以通过Load按钮手动加载
  }, []);

  const handleRunSQL = async () => {
    setIsRunning(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: sqlQuery,
          description: description,
          model: model
        })
      });
      const data = await response.json();

      const setdata =JSON.stringify(data);
      
      setResult(setdata);
      setIsRunning(false);
      message.success('The SQL query was executed successfully!');

      
    } catch (error) {
      console.error('SQL执行失败:', error);
      setIsRunning(false);
      message.error('SQL查询执行失败: ' + error.message);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const sqlConfig = {
        query: sqlQuery,
        description: description,
        model: model,
        result: result,
        timestamp: new Date().toLocaleString("sv-SE").replace(" ", "T")
      };
      
      const response = await fetch('http://localhost:5000/api/save-sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sqlConfig)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const saveResult = await response.json();
      console.log('SQL record saved:', saveResult);
      
      message.success(`SQL Saved successfully! file: ${saveResult.filename || 'unknown'}`);

    } catch (error) {
      console.error('Failed to save the SQL record', error);
      message.error('Failed to save the SQL record ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // 获取已保存的SQL记录列表
  const fetchSavedSQLRecords = async () => {
    try {
      setLoadingSQLs(true);
      const response = await fetch('http://localhost:5000/api/sqls');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const sqls = await response.json();
      setSavedSQLs(sqls);
    } catch (error) {
      console.error('获取SQL记录列表失败:', error);
      message.error('获取SQL记录列表失败: ' + error.message);
    } finally {
      setLoadingSQLs(false);
    }
  };

  // 加载指定的SQL记录
  const loadSQL = async (filename) => {
    try {
      const response = await fetch(`http://localhost:5000/api/sqls/${filename}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const sqlData = await response.json();
      
      if (sqlData.query) {
        setSqlQuery(sqlData.query);
        setDescription(sqlData.description || '');
        setModel(sqlData.model || 'gpt-4o');
        setResult(sqlData.result || null); // 加载保存的result
        message.success(`"${filename}" load successfully！`);
        setLoadModalVisible(false);
      } else {
        message.error('SQL记录数据格式错误');
      }
    } catch (error) {
      console.error('加载SQL记录失败:', error);
      message.error('加载SQL记录失败: ' + error.message);
    }
  };

  // 删除SQL记录
  const deleteSQL = async (filename) => {
    try {
      const response = await fetch(`http://localhost:5000/api/sqls/${filename}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      message.success(`"${filename}" delete successfully！`);
      fetchSavedSQLRecords(); // 重新获取列表
    } catch (error) {
      console.error('删除SQL记录失败:', error);
      message.error('删除SQL记录失败: ' + error.message);
    }
  };

  // 显示加载SQL记录对话框
  const handleLoadSQL = () => {
    setLoadModalVisible(true);
    fetchSavedSQLRecords();
  };

  return (
    <div className="sql-section">
      <div className="sql-header">
        <div>
          <Title level={4}>
            <DatabaseOutlined style={{ marginRight: 8 }} />
            SQL Query Interface
          </Title>
          <Text type="secondary"></Text>
        </div>
        <Space>
          <Button
            size="small"
            icon={<FolderOpenOutlined />}
            onClick={handleLoadSQL}
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
          <Button 
            type="primary" 
            icon={<PlayCircleOutlined />}
            onClick={handleRunSQL}
            loading={isRunning}
          >
            Execute
          </Button>
        </Space>
      </div>

      <div className="sql-content">
        <Space direction="vertical" style={{ width: '100%' }} size="large">


          {/* SQL查询输入 */}
          <div>
            <Text strong>SQL Query:</Text>
            <TextArea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              placeholder="Enter your SQL query..."
              rows={6}
              style={{ 
                marginTop: 8, 
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                fontSize: '13px'
              }}
            />
          </div>

          {/* 描述输入 */}
          <div>
            <Text strong>Description:</Text>
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Input attribute description..."
              rows={2}
              style={{ marginTop: 8 }}
            />
          </div>

          {/* 模型选择 */}
          <div>
            <Text strong>Model:</Text>
            <Select
              value={model}
              onChange={setModel}
              style={{ width: '100%', marginTop: 8 }}
              size="middle"
            >
              <Option value="gpt-4o">GPT-4o</Option>
              <Option value="gpt-4.1">GPT-4.1</Option>
              <Option value="claude">Claude</Option>

            </Select>
          </div>

          <Divider />

          {/* 查询结果 */}
          {result && (
            <div>
              <Title level={5}>Query Results</Title>
              {(() => {
                // 尝试解析为表格数据，使用与OperatorPanel相同的逻辑
                try {
                  const data = JSON.parse(result);
                  if (Array.isArray(data?.columns) && Array.isArray(data?.data)) {
                    // 过滤掉以 _ 开头的内部字段
                    const visibleKeys = data.columns.filter(key => !key.startsWith('_'));
                    const columns = visibleKeys.map(key => ({
                      title: key.replace('_', ' ').toUpperCase(),
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
                        pagination={{
                          pageSize: 10,
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total, range) => 
                            `${range[0]}-${range[1]} of ${total} items`
                        }}
                        size="small"
                        bordered
                        scroll={{ x: 'max-content' }}
                        style={{ marginTop: 16 }}
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
                  // 如果不是JSON或不是表格格式，就显示原始文本
                }
                
                // 默认显示文本（兼容旧格式）
                return <Text code style={{ whiteSpace: 'pre-wrap' }}>{result}</Text>;
              })()}
            </div>
          )}

          {/* 空状态提示 */}
          {!result && (
            <Card 
              style={{ 
                textAlign: 'center', 
                padding: '40px 20px',
                background: '#fafafa',
                border: '1px dashed #d9d9d9'
              }}
            >
              <DatabaseOutlined style={{ fontSize: 48, color: '#ccc', marginBottom: 16 }} />
              <Title level={4} style={{ color: '#999' }}>
                Ready to Execute SQL Query
              </Title>
              <Text type="secondary">
                
              </Text>
            </Card>
          )}
        </Space>
      </div>
      {/* Load SQL Modal */}
      <Modal
        title="Load Saved SQL Queries"
        open={loadModalVisible}
        onCancel={() => setLoadModalVisible(false)}
        footer={null}
        width={600}
      >
        <List
          loading={loadingSQLs}
          dataSource={savedSQLs}
          renderItem={(sqlConfig) => (
            <List.Item
              actions={[
                <Button 
                  type="primary"
                  size="small"
                  onClick={() => loadSQL(sqlConfig.filename)}
                >
                  Load
                </Button>,
                <Button
                  danger
                  size="small"
                  onClick={() => {
                    Modal.confirm({
                      title: '确认删除',
                      content: `确定要删除SQL记录 "${sqlConfig.name || sqlConfig.filename}" 吗？`,
                      onOk: () => deleteSQL(sqlConfig.filename)
                    });
                  }}
                >
                  Delete
                </Button>
              ]}
            >
              <List.Item.Meta
                title={sqlConfig.name || sqlConfig.filename}
                description={
                  <Space direction="vertical" size="small">
                    <Text type="secondary">
                      Modified time: {sqlConfig.modified_time}
                    </Text>
                    <Text type="secondary">
                      Model: {sqlConfig.model || 'Unknown'} | 
                      {sqlConfig.result && sqlConfig.result.trim() !== '' ? ' Effective' : ' Ineffective'}
                    </Text>

                  </Space>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: 'No saved SQL records' }}  
        />
      </Modal>
    </div>
  );
};


export default SQLPanel;
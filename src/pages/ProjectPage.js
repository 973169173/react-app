import React, { useState, useEffect } from 'react';
import { Card, Button, List, Typography, Space, Input, Modal, Form, message, Select } from 'antd';
import { PlusOutlined, FolderOutlined, SettingOutlined, DeleteOutlined } from '@ant-design/icons';
import OperatorPanel from '../components/OperatorPanel';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const ProjectPage = ({ documents, onRowClick, onBackToProjects }) => {
  const [currentView, setCurrentView] = useState('projects'); // 'projects' or 'operators'
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([
    {
      id: 1,
      name: 'Document Processing Project',
      function_name: 'document_processor',
      createdAt: '2025-08-23',
      status: 'active'
    },
    {
      id: 2,
      name: 'Data Extraction Pipeline',
      function_name: 'data_extractor',
      createdAt: '2025-08-22',
      status: 'active'
    },
    {
      id: 3,
      name: 'Text Analysis System',
      function_name: 'text_analyzer',
      createdAt: '2025-08-21',
      status: 'active'
    }
  ]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [indexOptions, setIndexOptions] = useState([]);
  const [loadingIndexes, setLoadingIndexes] = useState(false);

  // 获取索引列表
  const fetchIndexes = async () => {
    setLoadingIndexes(true);
    try {
      const response = await fetch('http://localhost:5000/api/indexes');
      if (!response.ok) {
        throw new Error('Failed to fetch indexes');
      }
      const data = await response.json();
      setIndexOptions(data.indexes || []);
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

  const handleProjectClick = (project) => {
    setSelectedProject(project);
    setCurrentView('operators');
  };

  const handleBackToProjects = () => {
    setCurrentView('projects');
    setSelectedProject(null);
  };

  const handleCreateProject = () => {
    setIsModalVisible(true);
    // 打开模态框时重新获取索引列表
    fetchIndexes();
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      console.log('Form values:', values);
      // 调用后端创建项目接口
      const response = await fetch('http://localhost:5000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
          body: JSON.stringify({
          project_name: values.projectname,
          description: values.description,
          index_name: values.index_name || '',

        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create project');
      }

      const result = await response.json();
      
      // 将创建的项目添加到列表
      const newProject = {
        name: values.name,
        function_name: result.function_name,
        description: values.description,
        index_name: values.index_name || '',
        createdAt: new Date().toLocaleString("sv-SE").replace(" ", "T"),
        status: result.status || 'active'
      };
      
      setProjects([...projects, newProject]);
      setIsModalVisible(false);
      form.resetFields();
      message.success('Project created successfully');
      
    } catch (error) {
      console.error('Create project failed:', error);
      message.error('Failed to create project: ' + error.message);
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleDeleteProject = (projectId, e) => {
    e.stopPropagation();
    Modal.confirm({
      title: 'Confirm Delete',
      content: 'Are you sure you want to delete this project? This action cannot be undone.',
      onOk: () => {
        setProjects(projects.filter(p => p.id !== projectId));
        message.success('Project deleted successfully');
      }
    });
  };

  if (currentView === 'operators' && selectedProject) {
    return (
      <OperatorPanel 
        documents={documents} 
        onRowClick={onRowClick} 
        showBackButton={true}
        onBackToProjects={handleBackToProjects}
        projectInfo={selectedProject}
      />
    );
  }

  return (
    <div className="operators-section">
      <div className="operators-header">
        <div>
          <Title level={4} style={{ margin: 0 }}>Project Management</Title>
        </div>
        <div>
          <Space size="middle">
            <Search
              placeholder="Search projects..."
              style={{ width: 300 }}
              allowClear
            />
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleCreateProject}
            >
              Create Project
            </Button>
          </Space>
        </div>
      </div>

      <div className="operators-list">
        <List
          grid={{
            gutter: 16,
            xs: 1,
            sm: 2,
            md: 2,
            lg: 3,
            xl: 3,
            xxl: 4,
          }}
          dataSource={projects}
          renderItem={(project) => (
            <List.Item>
              <Card
                hoverable
                onClick={() => handleProjectClick(project)}
                actions={[
                  <SettingOutlined key="setting" />,
                  <DeleteOutlined 
                    key="delete" 
                    onClick={(e) => handleDeleteProject(project.id, e)}
                  />,
                ]}
                style={{ height: '200px' }}
              >
                <div style={{ height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <FolderOutlined style={{ fontSize: '25px', marginRight: '8px', color: '#1890ff' }} />
                      <Title level={5} style={{ margin: 0 }}>
                        {project.name}
                      </Title>
                    </div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {project.description}
                    </Text>
                  </div>
                  <div>
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Created: {project.createdAt}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Status: {project.status === 'active' ? 'Active' : 'Inactive'}
                      </Text>
                    </Space>
                  </div>
                </div>
              </Card>
            </List.Item>
          )}
        />
      </div>

      <Modal
        title="Create New Project"
        visible={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText="Create"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="projectname"
            label="Project Name"
            rules={[{ required: true, message: 'Please enter project name' }]}
          >
            <Input placeholder="Enter project name" />
          </Form.Item>



          <Form.Item
            name="description"
            label="Project Description"
            rules={[{ required: true, message: 'Please enter project description' }]}
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Describe your project"
            />
          </Form.Item>

          <Form.Item
            name="index_name"
            label="Index Name"
            rules={[{ required: false }]}
          >
            <Select 
              placeholder="Select an index (optional)"
              allowClear
              loading={loadingIndexes}
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {indexOptions.map(index => (
                <Option key={index.id} value={index.id}>
                  {index.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectPage;
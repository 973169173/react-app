import React, { useState } from 'react';
import { Layout, Menu, Typography } from 'antd';
import { 
  ExperimentOutlined, 
  FolderOpenOutlined,
  FunctionOutlined,
  DatabaseOutlined,
  MessageOutlined
} from '@ant-design/icons';
import DocumentManager from './DocumentManager';
import ProjectPage from '../pages/ProjectPage';
import SQLPanel from '../pages/SQLPage';
import NaturalLanguagePanel from '../pages/NaturalLanguagePage';
import './PromptStudio.css';

const { Sider, Content } = Layout;
const { Title } = Typography;

const PromptStudio = () => {
  const [currentPage, setCurrentPage] = useState('operators');
  const [documents, setDocuments] = useState([]);

  const handleDocumentAdd = (newDocument) => {
    const exists = documents.some(doc => doc.filename === newDocument.filename || doc.id === newDocument.id);
    if (!exists) {
      setDocuments(prev => [...prev, newDocument]);
    }
  };

  const handleDocumentsSet = (newDocuments) => {
    setDocuments(newDocuments);
  };

  const handleDocumentDelete = (documentId) => {
    setDocuments(documents.filter(doc => doc.id !== documentId));
  };

  const handleRowClick = (record, columnKey) => {
    // 查找对应的文档
    let targetDoc = null;
    
    const clickedValue = record[columnKey];
    if (clickedValue) {
      targetDoc = documents.find(doc => doc.name === clickedValue || doc.name === clickedValue + '.txt' || doc.name === clickedValue + '.pdf');
      
      if (!targetDoc) {
        targetDoc = documents.find(doc => {
          const docNameBase = doc.name.replace(/\.(txt|pdf)$/i, '');
          return docNameBase === clickedValue;
        });
      }
    }
    
    // ③ 遍历这一行的所有列值
    if (!targetDoc) {
      const exts = ['txt', 'pdf'];          // 需要更多后缀就往这里加
      const norm = (s) => String(s ?? '').trim().toLowerCase();
      for (const key of Object.keys(record)) {
        const v = norm(record[key]);
        if (!v) continue;

        targetDoc = documents.find(doc => {
          const name = norm(doc.name);
          const base = name.replace(new RegExp(`\\.(${exts.join('|')})$`, 'i'), '');
          return (
            name === v ||                              // 完全相等
            exts.some(ext => name === `${v}.${ext}`) ||// value + 扩展名
            base === v                                 // 去扩展名后比较
          );
        });

        if (targetDoc) break;
      }
    }

    if (targetDoc) {
      // 从 _source_texts 中获取该列对应的原文
      let highlightText = record[columnKey]; // 默认使用单元格值
      let isNoneValue = false; // 标识是否为 None 值
      
      // 检查单元格值是否为 None
      if (!clickedValue || clickedValue === 'None' || clickedValue === 'null' || clickedValue === '') {
        isNoneValue = true;
      }
      
      // 如果有 _source_texts 数据，使用原文
      const sourceKey = `_source_${columnKey}`;
      const val = record[sourceKey];  
      if (val) {
        highlightText = val;
        //console.log(`Using source text for column '${columnKey}':`, highlightText);
      } else {
        console.log(`No source text found for column '${columnKey}', using cell value:`, highlightText);
      }
      
      if (window.triggerDocumentPreview) {
        //console.log('Triggering document preview with source text');
        window.triggerDocumentPreview(targetDoc, highlightText, isNoneValue);
      } else {
        console.error('window.triggerDocumentPreview not available');
      }
    } else {
      console.warn('No document found for record:', record);
    }
  };

  const handleDocumentPreview = (document, highlightText = null) => {
    return { document, highlightText };
  };

  const menuItems = [
    {
      key: 'prompt-studio',
      icon: <ExperimentOutlined />,
      label: 'Prompt Studio',
      children: [
        {
          key: 'operators',
          icon: <FunctionOutlined />,
          label: 'Operators',
        },
        {
          key: 'sql',
          icon: <DatabaseOutlined />,
          label: 'SQL Query',
        },
        {
          key: 'natural-language',
          icon: <MessageOutlined />,
          label: 'Natural Language',
        }
      ]
    },
    {
      key: 'workflows',
      icon: <FolderOpenOutlined />,
      label: 'Workflows',
    }
  ];

  const renderMainContent = () => {
    switch (currentPage) {
      case 'operators':
        return <ProjectPage documents={documents} onRowClick={handleRowClick} />;
      case 'sql':
        return <SQLPanel documents={documents} onRowClick={handleRowClick} />;
      case 'natural-language':
        return <NaturalLanguagePanel documents={documents} onRowClick={handleRowClick} />;
      default:
        return <ProjectPage documents={documents} onRowClick={handleRowClick} />;
    }
  };

  return (
    <Layout className="prompt-studio" style={{ height: '100vh' }}>
      {/* 左侧导航栏 */}
      <Sider width={250} className="sidebar">
        <div className="logo">
          <Title level={4} style={{ color: 'white', margin: '16px' }}>
            Unstract
          </Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['operators']}
          defaultOpenKeys={['prompt-studio']}
          items={menuItems}
          onSelect={({ key }) => {
            if (['operators', 'sql', 'natural-language'].includes(key)) {
              setCurrentPage(key);
            }
          }}
        />
      </Sider>

      {/* 主内容区域 */}
      <Layout>
        <Content className="main-content">
          <div className="content-wrapper">
            {/* 主内容区域 */}
            {renderMainContent()}

            {/* 右侧文档展示区域 */}
            <div className="documents-section">
              <DocumentManager 
                documents={documents}
                onDocumentAdd={handleDocumentAdd}
                onDocumentDelete={handleDocumentDelete}
                onDocumentsSet={handleDocumentsSet}
                onDocumentPreview={handleDocumentPreview}
              />
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default PromptStudio;

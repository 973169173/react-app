import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Upload, message, Modal } from 'antd';
import { 
  UploadOutlined, 
  EyeOutlined, 
  DeleteOutlined, 
  DownloadOutlined,
  FileTextOutlined,
  FilePdfOutlined 
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;

const DocumentManager = ({ documents, onDocumentAdd, onDocumentDelete, onDocumentsSet, onDocumentPreview }) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [expandedDocIds, setExpandedDocIds] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [highlightText, setHighlightText] = useState(null);

  // 组件加载时从服务器获取文档列表
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/documents');
        if (response.ok) {
          const serverDocuments = await response.json();
          // 直接设置文档列表，而不是逐个添加
          if (onDocumentsSet) {
            onDocumentsSet(serverDocuments);
          }
          setLoaded(true);
        }
      } catch (error) {
        console.error('加载文档失败:', error);
        setLoaded(true);
      }
    };

    if (!loaded) {
      loadDocuments();
    }
  }, [loaded, onDocumentsSet]);

  // 监听外部预览请求
  useEffect(() => {
    if (onDocumentPreview) {
      // 创建一个全局方法供外部调用
      window.triggerDocumentPreview = (document, highlightText) => {
        //console.log('triggerDocumentPreview called:', document, highlightText);
        setPreviewDocument(document);
        setHighlightText(highlightText);
        setPreviewVisible(true);
      };
      //console.log('Global triggerDocumentPreview function set');
    }
  }, [onDocumentPreview]);

  const handlePreview = async (document, highlight = null) => {
    if (document.type.includes('pdf') || document.name.toLowerCase().endsWith('.pdf')) {
      // 对于PDF文件，从服务器下载并打开
      try {
        const response = await fetch(`http://localhost:5000/api/documents/${document.filename}/download`);
        if (response.ok) {
          const blob = await response.blob();
          const fileURL = URL.createObjectURL(blob);
          window.open(fileURL, '_blank');
        } else {
          message.error('PDF文件预览失败');
        }
      } catch (error) {
        message.error('PDF文件预览失败');
      }
    } else {
      // 对于文本文件，在模态框中显示
      setPreviewDocument(document);
      setHighlightText(highlight);
      setPreviewVisible(true);
    }
  };

  const handleCustomUpload = async ({ file, fileList }) => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    
    // 添加单个文件到FormData
    formData.append('files', file);

    try {
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        message.success(result.message);
        
        // 将上传的文件添加到文档列表
        result.files.forEach(file => {
          if (onDocumentAdd) {
            onDocumentAdd(file);
          }
        });
      } else {
        const error = await response.json();
        message.error(error.error || '上传失败');
      }
    } catch (error) {
      message.error('上传失败: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (doc) => {
    try {
      const response = await fetch(`http://localhost:5000/api/documents/${doc.filename}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        message.success('Delete successfully');
        if (onDocumentDelete) {
          onDocumentDelete(doc.id);
        }
      } else {
        const error = await response.json();
        message.error(error.error || '删除失败');
      }
    } catch (error) {
      message.error('删除失败: ' + error.message);
    }
  };

  const handleDownload = async (document) => {
    try {
      const response = await fetch(`http://localhost:5000/api/documents/${document.filename}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = document.name;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        message.error('下载失败');
      }
    } catch (error) {
      message.error('下载失败: ' + error.message);
    }
  };

  const uploadProps = {
    name: 'files',
    multiple: true,
    accept: '.pdf,.txt',
    customRequest: handleCustomUpload,
    showUploadList: false,
    beforeUpload: (file) => {
      const isValidType = file.type.includes('pdf') || 
                         file.type.includes('text') || 
                         file.name.toLowerCase().endsWith('.txt') ||
                         file.name.toLowerCase().endsWith('.pdf');
      if (!isValidType) {
        message.error(`${file.name} 格式不支持，只支持 PDF, TXT 格式！`);
        return Upload.LIST_IGNORE;
      }
      
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error(`${file.name} 文件大小超过 10MB！`);
        return Upload.LIST_IGNORE;
      }
      
      return true;
    },
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName) => {
    if (fileName.toLowerCase().includes('.pdf')) {
      return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
    }
    return <FileTextOutlined style={{ color: '#1890ff' }} />;
  };

  // 高亮文本功能
  const highlightContent = (content, highlight) => {
    if (!highlight || !content) return content;
    
    // 确保 highlight 是列表
    const highlights = Array.isArray(highlight) ? highlight : [highlight];
    
    // 转义特殊字符
    const escaped = highlights.map(h => String(h).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
    const parts = content.split(regex);
    
    return parts.map((part, index) => {
      const match = highlights.find(h => part.toLowerCase() === h.toLowerCase());
      if (match) {
        return (
          <span 
            key={index} 
            style={{ 
              backgroundColor: '#ffeb3b', 
              color: '#000',
              padding: '2px 4px',
              borderRadius: '2px',
              fontWeight: 'bold'
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };


  const handleExpand = (docId) => {
    setExpandedDocIds(prev => [...prev, docId]);
  };
  const handleCollapse = (docId) => {
    setExpandedDocIds(prev => prev.filter(id => id !== docId));
  };

  return (
    <div className="document-manager">
      <div className="documents-header">
        <Typography.Title level={4}>Documents</Typography.Title>
        <Space>
          <Upload {...uploadProps}>
            <Button size="small" icon={<UploadOutlined />} loading={uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </Upload>
        </Space>
      </div>

      <div className="documents-list">
        {documents.map(doc => {
          const expanded = expandedDocIds.includes(doc.id);
          return (
            <Card 
              key={doc.id}
              className="document-card"
              size="small"
              title={
                <Space>
                  {getFileIcon(doc.name)}
                  <Text ellipsis style={{ maxWidth: 200 }}>{doc.name}</Text>
                  
                </Space>
              }
              extra={
                <Space>
                  <Button 
                    size="small" 
                    icon={<EyeOutlined />}
                    onClick={() => handlePreview(doc)}
                  >
                    Preview
                  </Button>
                  <Button 
                    size="small" 
                    icon={<DeleteOutlined />}
                    danger
                    onClick={() => handleDeleteDocument(doc)}
                  />
                </Space>
              }
            >
              <div className="document-info">
                {doc.size && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Size: {formatFileSize(doc.size)}
                  </Text>
                )}
                {doc.uploadTime && (
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                    Uploaded: {doc.uploadTime}
                  </Text>
                )}
              </div>
              <div className="document-preview-content">
                {doc.content && (
                  <>
                    {!expanded ? (
                      <Paragraph 
                        ellipsis={{ rows: 3, expandable: false }}
                        style={{ fontSize: '12px', margin: '8px 0 0 0' }}
                      >
                        {doc.content}
                      </Paragraph>
                    ) : (
                      <Paragraph style={{ fontSize: '12px', margin: '8px 0 0 0' }}>
                        {doc.content}
                      </Paragraph>
                    )}
                    {!expanded ? (
                      <Button type="link" size="small" onClick={() => handleExpand(doc.id)} style={{ padding: 0 }}>
                        more
                      </Button>
                    ) : (
                      <Button type="link" size="small" onClick={() => handleCollapse(doc.id)} style={{ padding: 0 }}>
                        hide
                      </Button>
                    )}
                  </>
                )}
                {!doc.content && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {doc.type && doc.type.includes('pdf') ? 'PDF文件，点击Preview预览' : '无内容预览'}
                  </Text>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        title={previewDocument?.name}
        open={previewVisible}
        onCancel={() => {
          setPreviewVisible(false);
          setHighlightText(null);
        }}
        width={800}
        footer={[
          <Button key="download" icon={<DownloadOutlined />} onClick={() => handleDownload(previewDocument)}>
            Download
          </Button>,
          <Button key="close" onClick={() => {
            setPreviewVisible(false);
            setHighlightText(null);
          }}>
            Close
          </Button>
        ]}
      >
        {previewDocument && (
          <div style={{ 
            height: '500px', 
            overflow: 'auto', 
            padding: '16px',
            background: '#fafafa',
            border: '1px solid #d9d9d9',
            borderRadius: '4px'
          }}>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.6' }}>
              {highlightText ? 
                highlightContent(previewDocument.content || '无法显示文件内容', highlightText) :
                (previewDocument.content || '无法显示文件内容')
              }
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DocumentManager;

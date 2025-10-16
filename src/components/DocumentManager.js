import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Space, Typography, Upload, message, Modal, Input, List, Tree } from 'antd';
import { 
  UploadOutlined, 
  EyeOutlined, 
  DeleteOutlined, 
  DownloadOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  BuildOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useApiUrl } from '../configContext';

const { Text, Paragraph } = Typography;

const DocumentManager = ({ documents, onDocumentAdd, onDocumentDelete, onDocumentsSet, onDocumentPreview }) => {
  const getApiUrl = useApiUrl();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [expandedDocIds, setExpandedDocIds] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [highlightText, setHighlightText] = useState(null);
  const [isNoneValue, setIsNoneValue] = useState(false); // 标识是否为 None 值
  const highlightRef = useRef(null); // 用于引用高亮元素
  const [scrollTrigger, setScrollTrigger] = useState(0); // 用于触发滚动
  const [buildIndexModalVisible, setBuildIndexModalVisible] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [buildingIndex, setBuildingIndex] = useState(false);
  const [indexName, setIndexName] = useState('');
  const [selectedFoldersForIndex, setSelectedFoldersForIndex] = useState([]);
  const [availableDocumentsForIndex, setAvailableDocumentsForIndex] = useState([]);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null); // 用于存储PDF的blob URL
  
  // 新增状态用于文件夹管理
  const [expandedFolders, setExpandedFolders] = useState([]);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [foldersStructure, setFoldersStructure] = useState({});

  // 组件加载时从服务器获取文档列表
  useEffect(() => {
    const loadDocuments = async () => {
      try {
  const response = await fetch(getApiUrl('/api/documents'));
        if (response.ok) {
          const serverDocuments = await response.json();
          // 直接设置文档列表，而不是逐个添加
          if (onDocumentsSet) {
            onDocumentsSet(serverDocuments);
          }
          // 构建文件夹结构
          buildFolderStructure(serverDocuments);
          setLoaded(true);
        }
      } catch (error) {
        console.error('Load documents failed:', error);
        setLoaded(true);
      }
    };

    if (!loaded) {
      loadDocuments();
    }
  }, [loaded, onDocumentsSet]);

  // 构建文件夹结构
  const buildFolderStructure = (docs) => {
    const structure = {};
    docs.forEach(doc => {
      const folder = doc.folder || 'root';
      if (!structure[folder]) {
        structure[folder] = [];
      }
      structure[folder].push(doc);
    });
    setFoldersStructure(structure);
  };

  // 监听documents变化，重新构建文件夹结构
  useEffect(() => {
    buildFolderStructure(documents);
  }, [documents]);

  // 监听外部预览请求
  useEffect(() => {
    if (onDocumentPreview) {
      // 创建一个全局方法供外部调用
      window.triggerDocumentPreview = (document, highlightText, isNone = false) => {
        //console.log('triggerDocumentPreview called:', document, highlightText, isNone);
        setPreviewDocument(document);
        setHighlightText(highlightText);
        setIsNoneValue(isNone);
        setPreviewVisible(true);
        // 触发滚动
        setScrollTrigger(prev => prev + 1);
      };
      //console.log('Global triggerDocumentPreview function set');
    }
  }, [onDocumentPreview]);

  // 自动滚动到高亮位置
  useEffect(() => {
    if (previewVisible && highlightText && scrollTrigger > 0) {
      // 使用 setTimeout 确保 DOM 已经渲染完成
      const timer = setTimeout(() => {
        if (highlightRef.current) {
          
          highlightRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        } else {
          console.log('highlightRef.current is null');
        }
      }, 150); // 减少延迟时间以提高响应速度
      
      return () => clearTimeout(timer);
    }
  }, [scrollTrigger]);

  const handlePreview = async (document, highlight = null) => {
    // 如果是PDF文件，先下载并创建blob URL
    if (document.type?.includes('pdf') || document.name?.toLowerCase().endsWith('.pdf')) {
      try {
        const response = await fetch(getApiUrl(`/api/documents/${document.filename}/download`));
        if (response.ok) {
          const blob = await response.blob();
          const fileURL = URL.createObjectURL(blob);
          setPdfBlobUrl(fileURL);
        } else {
          message.error('PDF file loading failed');
          return;
        }
      } catch (error) {
        message.error('PDF file loading failed');
        console.error('PDF load error:', error);
        return;
      }
    } else {
      setPdfBlobUrl(null); // 清除之前的PDF URL
    }
    
    // 统一在模态框中显示所有文件类型
    setPreviewDocument(document);
    setHighlightText(highlight);
    setPreviewVisible(true);
  };  const handleCustomUpload = async ({ file, fileList }) => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    
    // 添加单个文件到FormData
    formData.append('files', file);
    
    // 如果指定了文件夹名称，也添加到FormData
    if (folderName.trim()) {
      formData.append('folder', folderName.trim());
    }

    try {
  const response = await fetch(getApiUrl('/api/upload'), {
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
        message.error(error.error || 'Upload failed');
      }
    } catch (error) {
      message.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // 新的上传处理函数，支持文件夹
  const handleUploadWithFolder = async () => {
    if (uploadingFiles.length === 0) {
      message.warning('Please select files first');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    
    // 添加所有文件到FormData
    uploadingFiles.forEach(file => {
      formData.append('files', file);
    });
    
    // 如果指定了文件夹名称，也添加到FormData
    if (folderName.trim()) {
      formData.append('folder', folderName.trim());
    }

    try {
  const response = await fetch(getApiUrl('/api/upload'), {
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
        
        // Clear upload state
        setUploadModalVisible(false);
        setFolderName('');
        setUploadingFiles([]);
      } else {
        const error = await response.json();
        message.error(error.error || 'Upload failed');
      }
    } catch (error) {
      message.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (doc) => {
    try {
  const response = await fetch(getApiUrl(`/api/documents/${doc.filename}`), {
        method: 'DELETE',
      });

      if (response.ok) {
        message.success('Delete successfully');
        if (onDocumentDelete) {
          onDocumentDelete(doc.id);
        }
      } else {
        const error = await response.json();
        message.error(error.error || 'Delete failed');
      }
    } catch (error) {
      message.error('Delete failed: ' + error.message);
    }
  };

  const handleDownload = async (doc) => {
    try {
  const response = await fetch(getApiUrl(`/api/documents/${doc.filename}/download`));
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = doc.name;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        message.error('Download failed');
      }
    } catch (error) {
      message.error('Download failed: ' + error.message);
    }
  };

  const uploadProps = {
    name: 'files',
    multiple: true,
    accept: '.pdf,.txt,.zip',
    customRequest: handleCustomUpload,
    showUploadList: false,
    beforeUpload: (file) => {
      const lower = file.name.toLowerCase();
      const isValidType = lower.endsWith('.pdf') || lower.endsWith('.txt') || lower.endsWith('.zip') ||
        file.type.includes('pdf') || file.type.includes('text');
      if (!isValidType) {
        message.error(`${file.name} format not supported, only PDF, TXT and ZIP formats are allowed!`);
        return Upload.LIST_IGNORE;
      }

      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error(`${file.name} file size exceeds 10MB!`);
        return Upload.LIST_IGNORE;
      }

      return true;
    },
  };

  // 上传模态框的文件选择配置
  const uploadModalProps = {
    name: 'files',
    multiple: true,
    accept: '.pdf,.txt,.zip',
    showUploadList: true,
    beforeUpload: (file) => {
      const lower = file.name.toLowerCase();
      const isValidType = lower.endsWith('.pdf') || lower.endsWith('.txt') || lower.endsWith('.zip') ||
        file.type.includes('pdf') || file.type.includes('text');
      if (!isValidType) {
        message.error(`${file.name} format not supported, only PDF, TXT and ZIP formats are allowed!`);
        return false;
      }

      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error(`${file.name} file size exceeds 10MB!`);
        return false;
      }

      setUploadingFiles(prev => [...prev, file]);
      return false; // 阻止自动上传
    },
    fileList: uploadingFiles.map((file, index) => ({
      uid: `${file.name}-${index}`,
      name: file.name,
      status: 'done',
      size: file.size
    })),
    onRemove: (file) => {
      const index = uploadingFiles.findIndex((f, i) => `${f.name}-${i}` === file.uid);
      if (index > -1) {
        setUploadingFiles(prev => prev.filter((_, i) => i !== index));
      }
    }
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
  const highlightContent = (content, highlight, isNone = false) => {
    if (!highlight || !content) return content;
    
    // 确保 highlight 是列表
    const highlights = Array.isArray(highlight) ? highlight : [highlight];
    
    // 转义特殊字符
    const escaped = highlights.map(h => String(h).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
    const parts = content.split(regex);
    
    // 根据是否为 None 值选择不同的高亮颜色
    const highlightStyle = isNone ? {
      backgroundColor: '#a8a8a8ff', // 橙色用于 None 值
      color: '#000',
      padding: '2px 4px',
      borderRadius: '2px',
      fontWeight: 'bold'
    } : {
      backgroundColor: '#ffeb3b', // 黄色用于正常值
      color: '#000',
      padding: '2px 4px',
      borderRadius: '2px',
      fontWeight: 'bold'
    };
    
    let isFirstMatch = true; // 标记是否为第一个匹配项
    
    return parts.map((part, index) => {
      const match = highlights.find(h => part.toLowerCase() === h.toLowerCase());
      if (match) {
        const element = (
          <span 
            key={index}
            ref={isFirstMatch ? highlightRef : null} // 只给第一个匹配项添加 ref
            style={highlightStyle}
          >
            {part}
          </span>
        );
        isFirstMatch = false; // 后续匹配项不添加 ref
        return element;
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

  // 文件夹展开折叠处理
  const handleFolderToggle = (folderName) => {
    setExpandedFolders(prev => {
      if (prev.includes(folderName)) {
        return prev.filter(name => name !== folderName);
      } else {
        return [...prev, folderName];
      }
    });
  };

  // 渲染文件夹和文件
  const renderFolderContent = () => {
      const folders = Object.keys(foldersStructure);
      
      return folders.map(folderName => {
        const folderDocs = foldersStructure[folderName];
        const isExpanded = expandedFolders.includes(folderName);
        const displayName = folderName === 'root' ? 'Root Directory' : folderName;
        
        return (
        <div key={folderName} className="folder-container" style={{ marginBottom: '12px' }}>
          {/* 文件夹标题 */}
          <div 
            className="folder-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 12px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              cursor: 'pointer',
              marginBottom: isExpanded ? '8px' : '0'
            }}
            onClick={() => handleFolderToggle(folderName)}
          >
            {isExpanded ? <FolderOpenOutlined /> : <FolderOutlined />}
            <Typography.Text strong style={{ marginLeft: '8px', flex: 1 }}>
              {displayName}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
              ({folderDocs.length} files)
            </Typography.Text>
          </div>
          
          {/* 文件夹内容 */}
          {isExpanded && (
            <div className="folder-content" style={{ marginLeft: '20px' }}>
              {folderDocs.map(doc => renderDocumentCard(doc))}
            </div>
          )}
        </div>
      );
    });
  };

  // 渲染单个文档卡片
  const renderDocumentCard = (doc) => {
    const expanded = expandedDocIds.includes(doc.id);
    return (
      <Card 
        key={doc.id}
        className="document-card"
        size="small"
        style={{ marginBottom: '8px' }}
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
              {doc.type && doc.type.includes('pdf') ? 'PDF file, click Preview to view' : 'No content preview available'}
            </Text>
          )}
        </div>
      </Card>
    );
  };

  // 处理构建索引
  const handleBuildIndex = () => {
    setBuildIndexModalVisible(true);
    setSelectedDocuments([]);
    setSelectedFoldersForIndex([]);
    setAvailableDocumentsForIndex([]);
    setIndexName('');
  };

  // 处理文件夹选择变化
  const handleFolderSelectionForIndex = (selectedFolders) => {
    setSelectedFoldersForIndex(selectedFolders);
    
    // 根据选中的文件夹筛选可用文档
    const availableDocs = [];
    selectedFolders.forEach(folderName => {
      if (foldersStructure[folderName]) {
        availableDocs.push(...foldersStructure[folderName]);
      }
    });
    
    setAvailableDocumentsForIndex(availableDocs);
    setSelectedDocuments([]); // 清空已选文档
  };

  // 执行构建索引
  const executeBuildIndex = async () => {
    if (selectedDocuments.length === 0) {
      message.warning('Please select at least one document');
      return;
    }

    if (!indexName.trim()) {
      message.warning('Please enter an index name');
      return;
    }

    try {
      setBuildingIndex(true);
  const response = await fetch(getApiUrl('/api/build-index'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documents: selectedDocuments,
          indexName: indexName.trim(),
          folderName: selectedFoldersForIndex
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      message.success(`Index "${indexName}" built successfully!`);
      setBuildIndexModalVisible(false);
      setSelectedDocuments([]);
      setIndexName('');
    } catch (error) {
      console.error('Build index failed:', error);
      message.error('Failed to build index: ' + error.message);
    } finally {
      setBuildingIndex(false);
    }
  };

  return (
    <div className="document-manager">
      <div className="documents-header">
        <Typography.Title level={4}>Documents</Typography.Title>
        <Space>
          <Button 
            size="small" 
            icon={<BuildOutlined />}
            onClick={handleBuildIndex}
          >
            Build Index
          </Button>
          <Button 
            size="small" 
            icon={<UploadOutlined />}
            onClick={() => setUploadModalVisible(true)}
            loading={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </Space>
      </div>

      <div className="documents-list">
        {renderFolderContent()}
      </div>

      {/* Upload to folder modal */}
      <Modal
        title="Upload Files to Folder"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false);
          setFolderName('');
          setUploadingFiles([]);
        }}
        onOk={handleUploadWithFolder}
        okText="Upload"
        cancelText="Cancel"
        confirmLoading={uploading}
        width={600}
      >
        <div style={{ marginBottom: '24px' }}>
          <Typography.Text strong>Folder Name:</Typography.Text>
          <Input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Enter folder name (leave empty for root directory)"
            style={{ marginTop: '8px' }}
          />
          <Typography.Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
            If the folder doesn't exist, it will be created automatically
          </Typography.Text>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <Typography.Text strong>Select Files:</Typography.Text>
          <div style={{ marginTop: '8px' }}>
            <Upload {...uploadModalProps}>
              <Button icon={<UploadOutlined />}>Choose Files</Button>
            </Upload>
          </div>
        </div>

        {uploadingFiles.length > 0 && (
          <div 
            style={{ 
              marginTop: '16px', 
              padding: '12px', 
              backgroundColor: '#f5f5f5', 
              borderRadius: '6px',
              minHeight: '40px' // 固定最小高度防止抖动
            }}
          >
            <Typography.Text type="secondary">
              {uploadingFiles.length} file{uploadingFiles.length > 1 ? 's' : ''} selected
            </Typography.Text>
          </div>
        )}
      </Modal>

      <Modal
        title={previewDocument?.name}
        open={previewVisible}
        onCancel={() => {
          setPreviewVisible(false);
          setHighlightText(null);
          setIsNoneValue(false);
          // 清理blob URL
          if (pdfBlobUrl) {
            URL.revokeObjectURL(pdfBlobUrl);
            setPdfBlobUrl(null);
          }
        }}
        width={800}
        footer={[
          <Button key="download" icon={<DownloadOutlined />} onClick={() => handleDownload(previewDocument)}>
            Download
          </Button>,
          <Button key="close" onClick={() => {
            setPreviewVisible(false);
            setHighlightText(null);
            setIsNoneValue(false);
            // 清理blob URL
            if (pdfBlobUrl) {
              URL.revokeObjectURL(pdfBlobUrl);
              setPdfBlobUrl(null);
            }
          }}>
            Close
          </Button>
        ]}
      >
        {previewDocument && (
          <div style={{ 
            height: '500px', 
            overflow: 'auto', 
            padding: previewDocument.type?.includes('pdf') || previewDocument.name?.toLowerCase().endsWith('.pdf') ? '0' : '16px',
            background: '#fafafa',
            border: '1px solid #d9d9d9',
            borderRadius: '4px'
          }}>
            {(previewDocument.type?.includes('pdf') || previewDocument.name?.toLowerCase().endsWith('.pdf')) ? (
              // PDF 文件使用 iframe 预览，使用 blob URL
              pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="PDF Preview"
                />
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Text type="secondary">Loading PDF...</Text>
                </div>
              )
            ) : (
              // 文本文件使用原来的方式预览
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.6' }}>
                {highlightText ? 
                  highlightContent(previewDocument.content || 'Unable to display file content', highlightText, isNoneValue) :
                  (previewDocument.content || 'Unable to display file content')
                }
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Build index modal */}
      <Modal
        title="Build Index"
        open={buildIndexModalVisible}
        onCancel={() => setBuildIndexModalVisible(false)}
        onOk={executeBuildIndex}
        okText="Build Index"
        cancelText="Cancel"
        confirmLoading={buildingIndex}
        width={700}
      >
        <div style={{ marginBottom: '16px' }}>
          <Typography.Text>
            Create an index for faster search and processing:
          </Typography.Text>
        </div>

        {/* Index name input */}
        <div style={{ marginBottom: '24px' }}>
          <Typography.Text strong>Index Name:</Typography.Text>
          <Input
            value={indexName}
            onChange={(e) => setIndexName(e.target.value)}
            placeholder="Enter index name (e.g., document_index_2025)"
            style={{ marginTop: '4px' }}
          />
        </div>

        {/* Folder selection */}
        <div style={{ marginBottom: '24px' }}>
          <Typography.Text strong>Step 1: Select Folders:</Typography.Text>
          <div style={{ 
            marginTop: '8px', 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {Object.keys(foldersStructure).map(folderName => {
              const displayName = folderName === 'root' ? 'Root Directory' : folderName;
              const fileCount = foldersStructure[folderName].length;
              
              return (
                <div key={folderName} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedFoldersForIndex.includes(folderName)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newSelectedFolders = [...selectedFoldersForIndex, folderName];
                          handleFolderSelectionForIndex(newSelectedFolders);
                        } else {
                          const newSelectedFolders = selectedFoldersForIndex.filter(name => name !== folderName);
                          handleFolderSelectionForIndex(newSelectedFolders);
                        }
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    <FolderOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                    <Typography.Text strong>{displayName}</Typography.Text>
                    <Typography.Text type="secondary" style={{ marginLeft: '8px', fontSize: '12px' }}>
                      ({fileCount} files)
                    </Typography.Text>
                  </div>
                </div>
              );
            })}
            
            {Object.keys(foldersStructure).length === 0 && (
              <Typography.Text type="secondary">No folders available</Typography.Text>
            )}
          </div>
          
          {selectedFoldersForIndex.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                Selected {selectedFoldersForIndex.length} folder{selectedFoldersForIndex.length > 1 ? 's' : ''}
              </Typography.Text>
            </div>
          )}
        </div>

        {/* Document selection */}
        {selectedFoldersForIndex.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <Typography.Text strong>Step 2: Select Documents:</Typography.Text>
            <div style={{ 
              marginTop: '8px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <List
                dataSource={availableDocumentsForIndex}
                renderItem={(document) => (
                  <List.Item style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <input
                        type="checkbox"
                        checked={selectedDocuments.includes(document.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDocuments([...selectedDocuments, document.name]);
                          } else {
                            setSelectedDocuments(selectedDocuments.filter(name => name !== document.name));
                          }
                        }}
                        style={{ marginRight: '12px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <Typography.Text strong>{document.name}</Typography.Text>
                        <br />
                        <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                          Folder: {document.folder === 'root' ? 'Root Directory' : document.folder} | 
                          Size: {formatFileSize(document.size || 0)} | 
                          Type: {document.type || 'Unknown'}
                        </Typography.Text>
                      </div>
                    </div>
                  </List.Item>
                )}
                locale={{ emptyText: 'No documents in selected folders' }}
              />
            </div>
            
            {availableDocumentsForIndex.length > 0 && (
              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                <Space>
                  <Button 
                    size="small" 
                    onClick={() => setSelectedDocuments(availableDocumentsForIndex.map(doc => doc.name))}
                  >
                    Select All
                  </Button>
                  <Button 
                    size="small" 
                    onClick={() => setSelectedDocuments([])}
                  >
                    Clear All
                  </Button>
                  <Typography.Text type="secondary">
                    Selected: {selectedDocuments.length} / {availableDocumentsForIndex.length}
                  </Typography.Text>
                </Space>
              </div>
            )}
          </div>
        )}

        {selectedFoldersForIndex.length === 0 && (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            backgroundColor: '#f9f9f9', 
            borderRadius: '6px',
            border: '1px dashed #d9d9d9'
          }}>
            <Typography.Text type="secondary">
              Please select folders first to see available documents
            </Typography.Text>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DocumentManager;

import sys
sys.path.append('/home/lijianhui/workspace/quest')


from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import os
import time
import json
from datetime import datetime
from werkzeug.utils import secure_filename
import pandas as pd
import time

app = Flask(__name__)
CORS(app)

# 配置上传文件夹和数据文件夹
UPLOAD_FOLDER = 'files'
DATA_FOLDER = 'data'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['DATA_FOLDER'] = DATA_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# 创建上传目录和数据目录
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
if not os.path.exists(DATA_FOLDER):
    os.makedirs(DATA_FOLDER)

from quest.backend.interface.operation import OperationImplementation

fun = OperationImplementation()


@app.route('/api/extract', methods=['POST'])
def extract_data():
    #time.sleep(10)
    print(request.json)
    type,prompt,model,parameters,foname=request.json.get('type'),request.json.get('prompt'),request.json.get('model'),request.json.get('parameters'),request.json.get('function_name');
    tablename,columnname=parameters.get('table_name',''),parameters.get('column_name','')
    print(type,prompt,model,parameters);
    fo_name=fun.extract_text(foname,tablename,columnname)
    df=fun.show_table_with_source(fo_name,tablename)
    return jsonify({
        'function_name':fo_name,
        'table':df.to_dict(orient="split")})
    

@app.route('/api/filter', methods=['POST'])
def filter():
    type,prompt,model,parameters,foname=request.json.get('type'),request.json.get('prompt'),request.json.get('model'),request.json.get('parameters'),request.json.get('function_name');
    tablename,columnname=parameters.get('table_name',''),parameters.get('column_name','')
    print(type,prompt,model,parameters);
    fo_name=fun.extract_text(foname,tablename,columnname)
    df=fun.show_table_with_source(fo_name,tablename)
    return jsonify({
        'function_name':fo_name,
        'table':df.to_dict(orient="split")})

@app.route('/api/retrieve', methods=['POST'])
def filter():
    type,prompt,model,parameters,foname=request.json.get('type'),request.json.get('prompt'),request.json.get('model'),request.json.get('parameters'),request.json.get('function_name');
    tablename,columnname=parameters.get('table_name',''),parameters.get('column_name','')
    print(type,prompt,model,parameters);
    fo_name=fun.retrieve_text(foname,tablename,columnname)
    df=fun.show_table_with_source(fo_name,tablename)
    return jsonify({
        'function_name':fo_name,
        'table':df.to_dict(orient="split")})



@app.route('/api/nl',methods=['POST'])
def nl():
    content,model=request.json.get('content'),request.json.get('model')
    data={
        'doc':['Aaron_Williams.txt','1111111','222222222'],
        'age':['30','12','212'],
        'name':['Aaron Williams','121','121'],
        '_source_age':[['Aaron Williams (born October 2, 1971) is an American former professional basketball player who played fourteen seasons in the National Basketball Association (NBA). He played at the power forward and center positions.','In 2000-01, as a member of the New Jersey Nets, Williams posted his best numbers as a pro, playing all 82 games while averaging 10.1 points and 7.2 rebounds per game, but also had the dubious distinction of leading the league in total personal fouls committed, with 319 (an average of 3.89 fouls per game).'],'121','121'],
        '_source_name':['In 2000-01, as a member of the New Jersey Nets, Williams posted his best numbers as a pro, playing all 82 games while averaging 10.1 points and 7.2 rebounds per game, but also had the dubious distinction of leading the league in total personal fouls committed, with 319 (an average of 3.89 fouls per game).','111','111']
    }
    df=pd.DataFrame(data)
    return jsonify(df.to_dict(orient="split"))


@app.route('/api/sql', methods=['POST'])
def sql_query():
    #time.sleep(2)
    sql,description,model = request.json.get('sql'), request.json.get('description'), request.json.get('model')
    data={
        'doc':['Aaron_Williams.txt','1111111','222222222'],
        'age':['30','12','212'],
        'name':['Aaron Williams','121','121'],
        '_source_age':['Aaron Williams (born October 2, 1971) is an American former professional basketball player who played fourteen seasons in the National Basketball Association (NBA). He played at the power forward and center positions.','121','121'],
        '_source_name':['In 2000-01, as a member of the New Jersey Nets, Williams posted his best numbers as a pro, playing all 82 games while averaging 10.1 points and 7.2 rebounds per game, but also had the dubious distinction of leading the league in total personal fouls committed, with 319 (an average of 3.89 fouls per game).','111','111']
    }
    df=pd.DataFrame(data)
    return jsonify(df.to_dict(orient="split"))

@app.route('/api/build-index', methods=['POST'])
def build_index():
    try:
        # 获取请求数据
        request_data = request.json
        if not request_data:
            return jsonify({'error': 'No request data provided'}), 400
            

        document_names = request_data.get('documents', [])
        tabel_name = request_data.get('table_name',[])
        fun.build_index(document_names,tabel_name)

        
        # 返回成功结果
        result = {
            'message': 'Index built successfully',
            'documents_processed': len(document_names),
            'index_id': f"idx_{int(time.time())}",
            'status': 'completed',
            'processed_documents': document_names
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': f'Failed to build index: {str(e)}'}), 500


@app.route('/api/projects', methods=['POST'])
def create_project():
    try:
        project_data = request.json
        if not project_data:
            return jsonify({'error': '无效的项目数据'}), 400
        indexname=project_data.get('index_name','')
        foname=fun.create_funObject(indexname)

        # 返回成功结果
        result = {
            'function_name': foname,
            'status': 'active'
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': f'创建项目失败: {str(e)}'}), 500






















#save/load相关

@app.route('/api/save-workflow', methods=['POST'])
def save_workflow():
    try:
        workflow_data = request.json
        
        if not workflow_data:
            return jsonify({'error': '没有收到工作流数据'}), 400
        
        # 生成文件名（使用时间戳）
        timestamp = workflow_data.get('timestamp', time.strftime('%Y%m%d_%H%M%S'))
        filename = f"workflow_{timestamp.replace(':', '-').replace('T', '_').split('.')[0]}.json"
        
        # 保存到data目录
        file_path = os.path.join(app.config['DATA_FOLDER'], filename)
        
        # 写入JSON文件
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(workflow_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            'message': 'Saved successfully',
            'filename': filename,
            'path': file_path,
            'operators_count': len(workflow_data.get('operators', [])),
            'documents_count': len(workflow_data.get('documents', []))
        })
        
    except Exception as e:
        return jsonify({'error': f'保存工作流失败: {str(e)}'}), 500

@app.route('/api/workflows', methods=['GET'])
def get_workflows():
    try:
        workflows = []
        data_folder = app.config['DATA_FOLDER']
        
        if os.path.exists(data_folder):
            for filename in os.listdir(data_folder):
                if filename.endswith('.json') and filename.startswith('workflow_'):
                    file_path = os.path.join(data_folder, filename)
                    if os.path.isfile(file_path):
                        # 获取文件信息
                        file_size = os.path.getsize(file_path)
                        modified_time = time.strftime('%Y-%m-%d %H:%M:%S', 
                                                    time.localtime(os.path.getmtime(file_path)))
                        
                        # 尝试读取workflow基本信息
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                workflow_data = json.load(f)
                                operators_count = len(workflow_data.get('operators', []))
                                documents_count = len(workflow_data.get('documents', []))
                        except:
                            operators_count = 0
                            documents_count = 0
                        
                        workflows.append({
                            'filename': filename,
                            'name': filename.replace('workflow_', '').replace('.json', ''),
                            'size': file_size,
                            'modified_time': modified_time,
                            'operators_count': operators_count,
                            'documents_count': documents_count
                        })
        
        # 按修改时间倒序排列
        workflows.sort(key=lambda x: x['modified_time'], reverse=True)
        return jsonify(workflows)
        
    except Exception as e:
        return jsonify({'error': f'获取工作流列表失败: {str(e)}'}), 500

@app.route('/api/workflows/<filename>', methods=['GET'])
def get_workflow(filename):
    try:
        # 确保文件名安全
        if not filename.endswith('.json') or not filename.startswith('workflow_'):
            return jsonify({'error': '无效的工作流文件名'}), 400
        
        file_path = os.path.join(app.config['DATA_FOLDER'], filename)
        
        if not os.path.exists(file_path):
            return jsonify({'error': '工作流文件不存在'}), 404
        
        with open(file_path, 'r', encoding='utf-8') as f:
            workflow_data = json.load(f)
        
        return jsonify(workflow_data)
        
    except Exception as e:
        return jsonify({'error': f'读取工作流失败: {str(e)}'}), 500

@app.route('/api/workflows/<filename>', methods=['DELETE'])
def delete_workflow(filename):
    try:
        # 确保文件名安全
        if not filename.endswith('.json') or not filename.startswith('workflow_'):
            return jsonify({'error': '无效的工作流文件名'}), 400
        
        file_path = os.path.join(app.config['DATA_FOLDER'], filename)
        
        if not os.path.exists(file_path):
            return jsonify({'error': '工作流文件不存在'}), 404
        
        os.remove(file_path)
        return jsonify({'message': f'工作流 {filename} 删除成功'})
        
    except Exception as e:
        return jsonify({'error': f'删除工作流失败: {str(e)}'}), 500

@app.route('/api/workflow/latest', methods=['GET'])
def latest_workflow():
    try:
        data_folder = app.config['DATA_FOLDER']
        
        if not os.path.exists(data_folder):
            return jsonify({'error': '数据目录不存在'}), 404
        
        # 获取所有workflow文件
        workflow_files = []
        for filename in os.listdir(data_folder):
            if filename.endswith('.json') and filename.startswith('workflow_'):
                file_path = os.path.join(data_folder, filename)
                file_stat = os.stat(file_path)
                workflow_files.append({
                    'filename': filename,
                    'modified_time': file_stat.st_mtime
                })
        
        if not workflow_files:
            return jsonify({'error': '没有找到工作流文件'}), 404
        
        # 按修改时间排序，获取最新的
        latest_file = max(workflow_files, key=lambda x: x['modified_time'])
        file_path = os.path.join(data_folder, latest_file['filename'])
        
        # 读取最新的workflow文件
        with open(file_path, 'r', encoding='utf-8') as f:
            workflow_data = json.load(f)
        
        # 添加版本标识
        workflow_data['version'] = 1
        
        return jsonify(workflow_data)
        
    except Exception as e:
        return jsonify({'error': f'获取最新工作流失败: {str(e)}'}), 500

@app.route('/api/save-sql', methods=['POST'])
def save_sql():
    try:
        sql_data = request.json
        
        if not sql_data:
            return jsonify({'error': '没有收到SQL数据'}), 400
        
        # 生成文件名（使用时间戳）
        timestamp = sql_data.get('timestamp', time.strftime('%Y%m%d_%H%M%S'))
        filename = f"sql_{timestamp.replace(':', '-').replace('T', '_').split('.')[0]}.json"
        
        # 保存到data目录
        file_path = os.path.join(app.config['DATA_FOLDER'], filename)
        
        # 写入JSON文件
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(sql_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            'message': 'SQL Saved successfully',
            'filename': filename,
            'path': file_path
        })
        
    except Exception as e:
        return jsonify({'error': f'保存SQL记录失败: {str(e)}'}), 500

@app.route('/api/sqls', methods=['GET'])
def get_sqls():
    try:
        sqls = []
        data_folder = app.config['DATA_FOLDER']
        
        if os.path.exists(data_folder):
            for filename in os.listdir(data_folder):
                if filename.endswith('.json') and filename.startswith('sql_'):
                    file_path = os.path.join(data_folder, filename)
                    file_stat = os.stat(file_path)
                    
                    # 读取文件内容以获取model和result信息
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            sql_data = json.load(f)
                        
                        sqls.append({
                            'filename': filename,
                            'name': filename.replace('.json', '').replace('sql_', ''),
                            'modified_time': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(file_stat.st_mtime)),
                            'size': file_stat.st_size,
                            'model': sql_data.get('model', 'Unknown'),
                            'result': sql_data.get('result', ''),
                            'description': sql_data.get('description', '')
                        })
                    except json.JSONDecodeError:
                        # 如果文件损坏，只包含基本信息
                        sqls.append({
                            'filename': filename,
                            'name': filename.replace('.json', '').replace('sql_', ''),
                            'modified_time': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(file_stat.st_mtime)),
                            'size': file_stat.st_size,
                            'model': 'Unknown',
                            'result': '',
                            'description': 'File corrupted'
                        })
        
        # 按修改时间倒序排列
        sqls.sort(key=lambda x: x['modified_time'], reverse=True)
        return jsonify(sqls)
        
    except Exception as e:
        return jsonify({'error': f'获取SQL记录列表失败: {str(e)}'}), 500

@app.route('/api/sqls/<filename>', methods=['GET'])
def get_sql(filename):
    try:
        # 安全检查文件名
        if not filename.endswith('.json') or not filename.startswith('sql_'):
            return jsonify({'error': '无效的SQL文件名'}), 400
            
        file_path = os.path.join(app.config['DATA_FOLDER'], filename)
        
        if not os.path.exists(file_path):
            return jsonify({'error': 'SQL文件不存在'}), 404
            
        with open(file_path, 'r', encoding='utf-8') as f:
            sql_data = json.load(f)
            
        return jsonify(sql_data)
        
    except json.JSONDecodeError:
        return jsonify({'error': 'SQL文件格式错误'}), 400
    except Exception as e:
        return jsonify({'error': f'读取SQL记录失败: {str(e)}'}), 500

@app.route('/api/sqls/<filename>', methods=['DELETE'])
def delete_sql(filename):
    try:
        # 安全检查文件名
        if not filename.endswith('.json') or not filename.startswith('sql_'):
            return jsonify({'error': '无效的SQL文件名'}), 400
            
        file_path = os.path.join(app.config['DATA_FOLDER'], filename)
        
        if not os.path.exists(file_path):
            return jsonify({'error': 'SQL文件不存在'}), 404
            
        os.remove(file_path)
        return jsonify({'message': f'SQL记录 {filename} 删除成功'})
        
    except Exception as e:
        return jsonify({'error': f'删除SQL记录失败: {str(e)}'}), 500

@app.route('/api/sql/latest', methods=['GET'])
def latest_sql():
    try:
        data_folder = app.config['DATA_FOLDER']
        
        if not os.path.exists(data_folder):
            return jsonify({'error': '数据目录不存在'}), 404
        
        # 获取所有SQL文件
        sql_files = []
        for filename in os.listdir(data_folder):
            if filename.endswith('.json') and filename.startswith('sql_'):
                file_path = os.path.join(data_folder, filename)
                file_stat = os.stat(file_path)
                sql_files.append({
                    'filename': filename,
                    'modified_time': file_stat.st_mtime
                })
        
        if not sql_files:
            return jsonify({'error': '没有找到SQL文件'}), 404
        
        # 按修改时间排序，获取最新的
        latest_file = max(sql_files, key=lambda x: x['modified_time'])
        file_path = os.path.join(data_folder, latest_file['filename'])
        
        # 读取最新的SQL文件
        with open(file_path, 'r', encoding='utf-8') as f:
            sql_data = json.load(f)
        
        # 添加版本标识
        sql_data['version'] = 1
        
        return jsonify(sql_data)
        
    except Exception as e:
        return jsonify({'error': f'获取最新SQL记录失败: {str(e)}'}), 500











#文件相关
@app.route('/api/upload', methods=['POST'])
def upload_files():
    try:
        uploaded_files = []
        files = request.files.getlist('files')
        
        for file in files:
            if file.filename == '':
                continue
                
            # 检查文件类型
            allowed_extensions = {'txt', 'pdf'}
            if not ('.' in file.filename and 
                    file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
                return jsonify({'error': f'文件 {file.filename} 格式不支持'}), 400
            
            # 使用安全的原始文件名
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            # 如果文件已存在，直接跳过
            if os.path.exists(file_path):
                continue
            
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            # 获取文件信息
            file_size = os.path.getsize(file_path)
            upload_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())
            
            # 读取文件内容（仅文本文件）
            content = None
            if filename.lower().endswith('.txt'):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                except UnicodeDecodeError:
                    try:
                        with open(file_path, 'r', encoding='gbk') as f:
                            content = f.read()
                    except:
                        content = None
            
            uploaded_files.append({
                'id': abs(hash(filename)),  # 使用文件名hash作为固定ID
                'name': filename,
                'filename': filename,
                'content': content,
                'size': file_size,
                'type': 'application/pdf' if filename.lower().endswith('.pdf') else 'text/plain',
                'uploadTime': upload_time
            })
        
        return jsonify({'files': uploaded_files, 'message': f'成功上传 {len(uploaded_files)} 个文件'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents', methods=['GET'])
def get_documents():
    try:
        documents = []
        if os.path.exists(app.config['UPLOAD_FOLDER']):
            for filename in os.listdir(app.config['UPLOAD_FOLDER']):
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                if os.path.isfile(file_path):
                    file_size = os.path.getsize(file_path)
                    upload_time = time.strftime('%Y-%m-%d %H:%M:%S', 
                                               time.localtime(os.path.getctime(file_path)))
                    
                    # 读取文件内容（仅文本文件）
                    content = None
                    if filename.lower().endswith('.txt'):
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                        except UnicodeDecodeError:
                            try:
                                with open(file_path, 'r', encoding='gbk') as f:
                                    content = f.read()
                            except:
                                content = None
                    
                    documents.append({
                        'id': hash(filename),  # 使用文件名hash作为ID
                        'name': filename,
                        'filename': filename,
                        'content': content,
                        'size': file_size,
                        'type': 'application/pdf' if filename.lower().endswith('.pdf') else 'text/plain',
                        'uploadTime': upload_time
                    })
        
        return jsonify(documents)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents/<filename>', methods=['DELETE'])
def delete_document(filename):
    try:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({'message': f'文件 {filename} 删除成功'})
        else:
            return jsonify({'error': '文件不存在'}), 404
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents/<filename>/download', methods=['GET'])
def download_document(filename):
    try:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(file_path):
            return send_file(file_path, as_attachment=True, download_name=filename)
        else:
            return jsonify({'error': '文件不存在'}), 404
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Conversation 相关的 API 端点
@app.route('/api/save-conversation', methods=['POST'])
def save_conversation():
    try:
        conversation_data = request.json
        if not conversation_data:
            return jsonify({'error': '无效的对话数据'}), 400
        
        # 生成文件名
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'conversation_{timestamp}.json'
        
        # 确保数据目录存在
        data_folder = app.config['DATA_FOLDER']
        os.makedirs(data_folder, exist_ok=True)
        
        # 保存文件
        file_path = os.path.join(data_folder, filename)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(conversation_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            'message': ' Conversation Saved successfully',
            'filename': filename
        })
        
    except Exception as e:
        return jsonify({'error': f'保存对话记录失败: {str(e)}'}), 500

@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    try:
        conversations = []
        data_folder = app.config['DATA_FOLDER']
        
        if os.path.exists(data_folder):
            for filename in os.listdir(data_folder):
                if filename.endswith('.json') and filename.startswith('conversation_'):
                    file_path = os.path.join(data_folder, filename)
                    file_stat = os.stat(file_path)
                    
                    # 读取文件内容以获取基本信息
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            conversation_data = json.load(f)
                        
                        # 计算对话轮数
                        conversation_count = len(conversation_data.get('conversations', []))
                        
                        conversations.append({
                            'filename': filename,
                            'name': filename.replace('.json', '').replace('conversation_', ''),
                            'modified_time': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(file_stat.st_mtime)),
                            'size': file_stat.st_size,
                            'model': conversation_data.get('model', 'Unknown'),
                            'conversation_count': conversation_count,
                            'description': f'{conversation_count} rounds of conversation'
                        })
                    except json.JSONDecodeError:
                        # 如果文件损坏，只包含基本信息
                        conversations.append({
                            'filename': filename,
                            'name': filename.replace('.json', '').replace('conversation_', ''),
                            'modified_time': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(file_stat.st_mtime)),
                            'size': file_stat.st_size,
                            'model': 'Unknown',
                            'conversation_count': 0,
                            'description': 'File corrupted'
                        })
        
        # 按修改时间倒序排列
        conversations.sort(key=lambda x: x['modified_time'], reverse=True)
        return jsonify(conversations)
        
    except Exception as e:
        return jsonify({'error': f'获取对话记录列表失败: {str(e)}'}), 500

@app.route('/api/conversations/<filename>', methods=['GET'])
def get_conversation(filename):
    try:
        # 安全检查文件名
        if not filename.endswith('.json') or not filename.startswith('conversation_'):
            return jsonify({'error': '无效的文件名'}), 400
        
        file_path = os.path.join(app.config['DATA_FOLDER'], filename)
        
        if not os.path.exists(file_path):
            return jsonify({'error': '对话记录不存在'}), 404
        
        with open(file_path, 'r', encoding='utf-8') as f:
            conversation_data = json.load(f)
        
        return jsonify(conversation_data)
        
    except Exception as e:
        return jsonify({'error': f'读取对话记录失败: {str(e)}'}), 500

@app.route('/api/conversations/<filename>', methods=['DELETE'])
def delete_conversation(filename):
    try:
        # 安全检查文件名
        if not filename.endswith('.json') or not filename.startswith('conversation_'):
            return jsonify({'error': '无效的文件名'}), 400
        
        file_path = os.path.join(app.config['DATA_FOLDER'], filename)
        
        if not os.path.exists(file_path):
            return jsonify({'error': '对话记录不存在'}), 404
        
        os.remove(file_path)
        return jsonify({'message': '对话记录删除成功'})
        
    except Exception as e:
        return jsonify({'error': f'删除对话记录失败: {str(e)}'}), 500


if __name__=='__main__':
    app.run(debug=True)

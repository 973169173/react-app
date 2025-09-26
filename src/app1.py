import sys
#sys.path.append('/home/yuxinjiang/quest')  # 添加 quest 的父目录到 sys.path
#sys.path.insert(0, '/data/guyang/quest')  # 将内层 quest 设为包根
sys.path.append('/home/lijianhui/workspace/quest')  # 添加 quest 的父目录到 sys.path
#sys.path.insert(0, '/home/lijianhui/workspace/quest/quest')  # 将内层 quest 设为包根


from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import os
import time
import json
from datetime import datetime
from werkzeug.utils import secure_filename
import pandas as pd
import time
import uuid
import logging
from quest.backend.interface.persistence import init_task, snapshot, update_task,complete_task
from quest.backend.interface.nl import NLImplementation
import threading
from flask import Response

app = Flask(__name__)
app.debug = True
app.logger.setLevel(logging.DEBUG)
CORS(app)

# 配置上传文件夹、数据文件夹和项目文件夹
UPLOAD_FOLDER = 'files'
DATA_FOLDER = 'data'
PROJECTS_FOLDER = 'projects'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['DATA_FOLDER'] = DATA_FOLDER
app.config['PROJECTS_FOLDER'] = PROJECTS_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# 创建必要的目录
for folder in [UPLOAD_FOLDER, DATA_FOLDER, PROJECTS_FOLDER]:
    if not os.path.exists(folder):
        os.makedirs(folder)

from quest.backend.interface.operation import OperationImplementation
from quest.backend.interface.operation import OperationImplementation

fun = OperationImplementation()
fun1=NLImplementation()

@app.route('/api/extract', methods=['POST'])
def extract_data():
    #time.sleep(10)
    print(request.json)
    type,model,parameters,foname=request.json.get('type'),request.json.get('model'),request.json.get('parameters'),request.json.get('function_name')
    prompt,mode,tablename,columnname,columns_prompt=parameters.get('prompt',''),parameters.get('mode',''),parameters.get('tablename',''),parameters.get('column_name',''),parameters.get('columns_prompt','')
    print(type,prompt,model,parameters)
    fo_name = ""
    if(mode == 'basic'):
        fo_name=fun.extract_text(foname,tablename,columnname,columns_prompt)
    elif(mode == 'semantic'):
        fo_name=fun.extract_text_semantic(foname,tablename,columns_prompt)
    df=fun.show_table_with_source(fo_name,tablename)
    return jsonify({
        'function_name':fo_name,
        'table':df.to_dict(orient="split")})
    

@app.route('/api/filter', methods=['POST'])
def filter():
    type,model,parameters,foname=request.json.get('type'),request.json.get('model'),request.json.get('parameters'),request.json.get('function_name')
    tablename,condition,columnname,columns_prompt,mode,prompt=parameters.get('tablename',''),parameters.get('condition',''),parameters.get('column_name',''),parameters.get('columns_prompt',''),parameters.get('mode',''),parameters.get('prompt','')
    print(type,prompt,model,parameters)
    if(mode == 'basic'):
        fo_name=fun.filter_text(foname,tablename,columnname,condition,columns_prompt)
    elif(mode == 'semantic'):
        fo_name=fun.filter_text_semantic(foname,tablename,prompt)
    df=fun.show_table_with_source(fo_name,tablename)
    return jsonify({
        'function_name':fo_name,
        'table':df.to_dict(orient="split")})

@app.route('/api/retrieve', methods=['POST'])
def retrieve():
    print("get json\n", request.json)
    type,model,parameters,foname=request.json.get('type'),request.json.get('model'),request.json.get('parameters'),request.json.get('function_name');
    tablename,columnname,prompt =parameters.get('tablename',''),parameters.get('column_name',''),parameters.get('columns_prompt','')
    
    print(type,prompt,model,parameters)
    indexer_name_list = fun.get_database_indexer_name_list()  # Modify
    print("indexer: ", indexer_name_list)

    foname = fun.add_indexer_list(foname, indexer_name_list, indexer_name_list)
    fo_name=fun.retrieve_text(foname,tablename,columnname,prompt)
    df=fun.show_table_with_source(fo_name,tablename)
    return jsonify({
        'function_name':fo_name,
        'table':df.to_dict(orient="split")})


@app.route('/api/nl-start', methods=['POST'])
def nl_start():
    """启动自然语言查询任务"""
    try:
        request_data = request.json or {}
        query = request_data.get("query", "")
        index = request_data.get("index", [])
        desc = request_data.get("desc", {})
        model = request_data.get("model", "gpt-4o")
        
        # 生成任务ID
        task_id = str(int(time.time() * 1000))
        
        # 初始化任务描述
        first_desc = f"{query[:50]}..."
        init_task(task_id, first_desc)
        
        # 启动后台任务（串行执行）
        def execute_nl_pipeline():
            try:
                # 第一步：解析自然语言，获得分析结果
                analysis_result = fun1.parse_nl(task_id, query)
                
                # 第二步：基于分析结果生成执行计划
                plan_list = fun1.analysis_to_plan_list(analysis_result)
                
                # 第三步：执行第一个计划（通常取第一个计划）
                if plan_list and len(plan_list) > 0:
                    first_plan = plan_list[0]
                    final_result = fun1.solve_plan(task_id, analysis_result, first_plan)
                    
                else:
                    update_task(task_id, "No execution plan generated")
                    return None
                complete_task(task_id, fun1.show_origin_table())    
                return True
            except Exception as e:
                update_task(task_id, f"Pipeline execution failed: {str(e)}")
                return None
        
        threading.Thread(target=execute_nl_pipeline, daemon=True).start()

        

        return jsonify({"task_id": task_id})
        
    except Exception as e:
        return jsonify({'error': f'启动任务失败: {str(e)}'}), 500

@app.route('/api/nl-events/<task_id>', methods=['GET'])
def nl_events(task_id):
    """获取任务进度的SSE流"""
    def stream():
        last = None
        heartbeat_at = time.time()
        while True:
            snap = snapshot(task_id)
            if not snap:
                yield 'event: error\ndata: {"message":"task not found"}\n\n'
                break

            # 检查是否有结果数据
            result_data = snap.get('result')
            if result_data:
                # 发送完成事件
                final_result = {
                    "type": "result",
                    "data": result_data,
                    "task_info": {
                        "task_id": snap["task_id"],
                        "started_at": snap["started_at"],
                        "updated_at": snap["updated_at"],
                        "description": snap["description"]
                    }
                }
                yield "event: result\n"
                yield f"data: {json.dumps(final_result, ensure_ascii=False)}\n\n"
                break

            # 发送进度更新
            payload = json.dumps(snap, ensure_ascii=False)
            if payload != last:
                last = payload
                yield "event: progress\n"
                yield f"data: {payload}\n\n"

            # 心跳，避免代理断开
            if time.time() - heartbeat_at > 10:
                yield ": keep-alive\n\n"
                heartbeat_at = time.time()

            time.sleep(0.3)

    return Response(stream(), headers={
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control"
    })

@app.route('/api/nl',methods=['POST'])
def nl():
    request_data = request.get_json(force=False, silent=False)
    table,query,desc=request_data.get("index"),request_data.get("query"),request_data.get("desc")
    print(type(table), table)
    print(type(query), query)
    print(type(desc), desc)
    df=fun.solve_agent(table,query,desc)
    return jsonify(df.to_dict(orient="split"))


@app.route('/api/sql', methods=['POST'])
def sql_query():
    #time.sleep(2)
    sql,description,model = request.json.get('query'), request.json.get('description'), request.json.get('model')
    print(sql,description,model)
    df=fun.solve_sql(sql,description,model)
    return jsonify(df.to_dict(orient="split"))

@app.route('/api/build-index', methods=['POST'])
def build_index():
    
    try:
        # 获取请求数据
        print("IN")
        request_data = request.json
        if not request_data:
            return jsonify({'error': 'No request data provided'}), 400
        print("OUT")
        print(request_data)

        foldername=request_data.get('folderName', "")
        document_names = request_data.get('documents', "")
        tabel_name = request_data.get('indexName',"")
        
        base_path = '/home/yuxinjiang/react-app/src/files/'+foldername[0] # Modify
        print("now build from:", document_names, " ", tabel_name, " ", base_path)
        full_paths = [os.path.join(base_path, name) for name in document_names]
        fun.build_indexer_with_name_set(base_path, tabel_name,'TextDoc',set(document_names))

        
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


# ==================== 项目管理相关接口 ====================

def get_projects_file_path():
    """获取项目数据文件路径"""
    return os.path.join(app.config['PROJECTS_FOLDER'], 'projects.json')

def load_projects():
    """从文件加载项目数据"""
    try:
        projects_file = get_projects_file_path()
        if os.path.exists(projects_file):
            with open(projects_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    except Exception as e:
        print(f"Error loading projects: {e}")
        return []

def save_projects(projects):
    """保存项目数据到文件"""
    try:
        projects_file = get_projects_file_path()
        with open(projects_file, 'w', encoding='utf-8') as f:
            json.dump(projects, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Error saving projects: {e}")
        return False

@app.route('/api/projects', methods=['GET'])
def get_projects():
    """获取项目列表"""
    try:
        projects = load_projects()
        return jsonify({
            'projects': projects,
            'total': len(projects)
        })
    except Exception as e:
        return jsonify({'error': f'获取项目列表失败: {str(e)}'}), 500



@app.route('/api/projects', methods=['POST'])
def create_project():
    try:
        project_data = request.json
        if not project_data:
            return jsonify({'error': '无效的项目数据'}), 400
        
        # 验证必需字段
        required_fields = ['project_name']
        for field in required_fields:
            if not project_data.get(field):
                return jsonify({'error': f'缺少必需字段: {field}'}), 400

        # 加载现有项目
        projects = load_projects()

        # 检查项目名是否已存在
        existing_names = [p['name'] for p in projects]
        if project_data['project_name'] in existing_names:
            return jsonify({'error': '项目名称已存在'}), 400

        # 生成唯一ID
        project_id = str(uuid.uuid4())


        indexname=project_data.get('index_name','')
        projectname=project_data.get('project_name','')
        if indexname:
            foname=fun.create_funcObject(projectname, [indexname])
        else:
            foname=fun.create_empty_funcObject(projectname)
        
        # 创建新项目
        new_project = {
            'id': project_id,
            'name': project_data['project_name'],
            'function_name': foname,
            'new_function_name': foname,
            'description': project_data.get('description', ''),
            'index_name': project_data.get('index_name', ''),
            'createdAt': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'updatedAt': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'status': 'active',
            'created_by': 'system'  # 可以后续改为实际用户
        }

        # 添加到项目列表
        projects.append(new_project)

        # 保存到文件
        if not save_projects(projects):
            return jsonify({'error': '保存项目失败'}), 500
        
        
        # 返回成功结果
        return jsonify({
            'message': '项目创建成功',
            'project': new_project,
            'function_name': foname,
            'status': 'active'
        })
        
    except Exception as e:
        return jsonify({'error': f'创建项目失败: {str(e)}'}), 500

@app.route('/api/projects/<project_id>', methods=['GET'])
def get_project(project_id):
    """获取单个项目详情"""
    try:
        projects = load_projects()
        project = next((p for p in projects if p['id'] == project_id), None)
        
        if not project:
            return jsonify({'error': '项目不存在'}), 404
            
        return jsonify(project)
        
    except Exception as e:
        return jsonify({'error': f'获取项目失败: {str(e)}'}), 500

@app.route('/api/projects/<project_id>', methods=['PUT'])
def update_project(project_id):
    """更新项目"""
    try:
        project_data = request.json
        if not project_data:
            return jsonify({'error': '无效的项目数据'}), 400

        projects = load_projects()
        project_index = next((i for i, p in enumerate(projects) if p['id'] == project_id), None)
        
        if project_index is None:
            return jsonify({'error': '项目不存在'}), 404

        # 更新项目数据
        project = projects[project_index]
        if 'project_name' in project_data and project_data['project_name']:
            # 检查新名称是否与其他项目冲突
            existing_names = [p['name'] for i, p in enumerate(projects) if i != project_index]
            if project_data['project_name'] in existing_names:
                return jsonify({'error': '项目名称已存在'}), 400
            project['name'] = project_data['project_name']
        
        if 'description' in project_data:
            project['description'] = project_data['description']
        
        if 'index_name' in project_data:
            project['index_name'] = project_data['index_name']
        
        if 'function_name' in project_data:
            project['new_function_name'] = project_data['function_name']
        
        if 'status' in project_data:
            project['status'] = project_data['status']

        project['updatedAt'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # 保存更新
        if not save_projects(projects):
            return jsonify({'error': '保存项目更新失败'}), 500

        return jsonify({
            'message': '项目更新成功',
            'project': project
        })

    except Exception as e:
        return jsonify({'error': f'更新项目失败: {str(e)}'}), 500

@app.route('/api/projects/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """删除项目"""
    try:
        projects = load_projects()
        project_index = next((i for i, p in enumerate(projects) if p['id'] == project_id), None)
        
        if project_index is None:
            return jsonify({'error': '项目不存在'}), 404

        # 获取要删除的项目信息
        deleted_project = projects[project_index]
        
        # 从列表中删除
        projects.pop(project_index)

        # 保存更新
        if not save_projects(projects):
            return jsonify({'error': '保存删除操作失败'}), 500

        return jsonify({
            'message': '项目删除成功',
            'deleted_project': deleted_project['name']
        })

    except Exception as e:
        return jsonify({'error': f'删除项目失败: {str(e)}'}), 500

@app.route('/api/project-data/<foname>', methods=['GET'])
def get_project_data(foname):
    """获取项目的operators, nodes, indeg, edges数据"""
    try:
        project_data=fun.get_project_info(foname)
        print(project_data)
        
        return jsonify(project_data)
        
    except Exception as e:
        return jsonify({'error': f'获取项目数据失败: {str(e)}'}), 500



@app.route('/api/indexes', methods=['GET'])
def get_indexes():
    """获取数据库的索引列表"""
    try:
        indexes =fun.get_database_indexer_name_list()
        #indexes=["111","222","333"]
        print(indexes)
        return jsonify({
            'indexes': indexes,
            'total': len(indexes)
        })
        
    except Exception as e:
        return jsonify({'error': f'获取索引列表失败: {str(e)}'}), 500

@app.route('/api/existindex', methods=['GET'])
def get_existindexes():
    """获取已有的的索引列表"""
    try:
        function_name = request.args.get('function_name', '')
        indexes =fun.get_database_indexer_name_list()
        #indexes=["111","222","333"]
        return jsonify({
            'indexes': indexes,
            'total': len(indexes)
        })
        
    except Exception as e:
        return jsonify({'error': f'获取索引列表失败: {str(e)}'}), 500

@app.route('/api/save-index-selection', methods=['POST'])
def save_index_selection():
    """保存索引选择"""
    try:
        data = request.json
        selected_indexes = data.get('selected_indexes', [])
        function_name = data.get('function_name', '')
        fun.add_indexer_list(function_name,selected_indexes,selected_indexes)
        
        return jsonify({
            'message': 'Index selection saved successfully',
            'selected_count': len(selected_indexes)
        })
        
    except Exception as e:
        return jsonify({'error': f'保存索引选择失败: {str(e)}'}), 500

















#save/load相关

@app.route('/api/save-workflow', methods=['POST'])
def save_workflow():
    try:

        
        workflow_data = request.json.get("operators")
        foname=request.json.get("function_name")
        print(workflow_data,"save")
        if not workflow_data:
            return jsonify({'error': '没有收到工作流数据'}), 400
        
        # # 生成文件名（使用时间戳）
        # timestamp = workflow_data.get('timestamp', time.strftime('%Y%m%d_%H%M%S'))
        # filename = f"workflow_{timestamp.replace(':', '-').replace('T', '_').split('.')[0]}.json"
        
        # # 保存到data目录
        # file_path = os.path.join(app.config['DATA_FOLDER'], filename)
        
        # # 写入JSON文件
        # with open(file_path, 'w', encoding='utf-8') as f:
        #     json.dump(workflow_data, f, ensure_ascii=False, indent=2)
       
        fun.save_project(foname, workflow_data)

        return jsonify({
            'message': 'Saved successfully'
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
        print(request.form)
        files = request.files.getlist('files')
        folder_name = request.form.get('folder', '').strip()  # 获取文件夹名称
        
        # 如果指定了文件夹，创建文件夹路径
        if folder_name:
            folder_path = os.path.join(app.config['UPLOAD_FOLDER'], folder_name)
            if not os.path.exists(folder_path):
                os.makedirs(folder_path)
            upload_dir = folder_path
        else:
            upload_dir = app.config['UPLOAD_FOLDER']
            folder_name = 'root'  # 根目录标识
        
        for file in files:
            if file.filename == '':
                continue
                
            # 检查文件类型
            allowed_extensions = {'txt', 'pdf'}
            if not ('.' in file.filename and 
                    file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
                return jsonify({'error': f'File {file.filename} format not supported'}), 400
            
            # 使用安全的原始文件名
            filename = secure_filename(file.filename)
            file_path = os.path.join(upload_dir, filename)
            
            # 如果文件已存在，直接跳过
            if os.path.exists(file_path):
                continue
            
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
                'id': abs(hash(f"{folder_name}_{filename}")),  # 使用文件夹+文件名hash作为固定ID
                'name': filename,
                'filename': filename,
                'folder': folder_name,  # 添加文件夹信息
                'content': content,
                'size': file_size,
                'type': 'application/pdf' if filename.lower().endswith('.pdf') else 'text/plain',
                'uploadTime': upload_time
            })
        
        return jsonify({'files': uploaded_files, 'message': f'Successfully uploaded {len(uploaded_files)} files'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents', methods=['GET'])
def get_documents():
    try:
        documents = []
        
        def scan_folder(folder_path, folder_name='root'):
            """递归扫描文件夹"""
            if not os.path.exists(folder_path):
                return
                
            for item in os.listdir(folder_path):
                item_path = os.path.join(folder_path, item)
                
                if os.path.isfile(item_path):
                    # 处理文件
                    file_size = os.path.getsize(item_path)
                    upload_time = time.strftime('%Y-%m-%d %H:%M:%S', 
                                               time.localtime(os.path.getctime(item_path)))
                    
                    # 读取文件内容（仅文本文件）
                    content = None
                    if item.lower().endswith('.txt'):
                        try:
                            with open(item_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                        except UnicodeDecodeError:
                            try:
                                with open(item_path, 'r', encoding='gbk') as f:
                                    content = f.read()
                            except:
                                content = None
                    
                    documents.append({
                        'id': abs(hash(f"{folder_name}_{item}")),  # 使用文件夹+文件名hash作为ID
                        'name': item,
                        'filename': item,
                        'folder': folder_name,  # 添加文件夹信息
                        'content': content,
                        'size': file_size,
                        'type': 'application/pdf' if item.lower().endswith('.pdf') else 'text/plain',
                        'uploadTime': upload_time
                    })
                elif os.path.isdir(item_path):
                    # 递归处理子文件夹
                    scan_folder(item_path, item)
        
        # 扫描上传文件夹
        if os.path.exists(app.config['UPLOAD_FOLDER']):
            scan_folder(app.config['UPLOAD_FOLDER'])
        
        return jsonify(documents)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents/<filename>', methods=['DELETE'])
def delete_document(filename):
    try:
        # 首先在根目录查找
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # 如果根目录没找到，递归查找所有子文件夹
        if not os.path.exists(file_path):
            found_path = None
            for root, dirs, files in os.walk(app.config['UPLOAD_FOLDER']):
                if filename in files:
                    found_path = os.path.join(root, filename)
                    break
            
            if found_path:
                file_path = found_path
            else:
                return jsonify({'error': 'File not found'}), 404
        
        os.remove(file_path)
        return jsonify({'message': f'File {filename} deleted successfully'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents/<filename>/download', methods=['GET'])
def download_document(filename):
    try:
        # 首先在根目录查找
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # 如果根目录没找到，递归查找所有子文件夹
        if not os.path.exists(file_path):
            found_path = None
            for root, dirs, files in os.walk(app.config['UPLOAD_FOLDER']):
                if filename in files:
                    found_path = os.path.join(root, filename)
                    break
            
            if found_path:
                file_path = found_path
            else:
                return jsonify({'error': 'File not found'}), 404
        
        return send_file(file_path, as_attachment=True, download_name=filename)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/folders', methods=['GET'])
def get_folders():
    """获取文件夹结构"""
    try:
        folders = []
        
        if os.path.exists(app.config['UPLOAD_FOLDER']):
            for item in os.listdir(app.config['UPLOAD_FOLDER']):
                item_path = os.path.join(app.config['UPLOAD_FOLDER'], item)
                if os.path.isdir(item_path):
                    # 统计文件夹中的文件数量
                    file_count = 0
                    for root, dirs, files in os.walk(item_path):
                        file_count += len([f for f in files if f.lower().endswith(('.txt', '.pdf'))])
                    
                    folders.append({
                        'name': item,
                        'path': item,
                        'fileCount': file_count
                    })
        
        return jsonify(folders)
    
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
    app.run(debug=True, port=3456)

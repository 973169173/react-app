import React from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import PromptStudio from './components/PromptStudio';
import 'antd/dist/reset.css';
import './App.css';

function App() {
  return (
    <ConfigProvider>
      <AntApp>
        <div className="App">
          <PromptStudio />
        </div>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;

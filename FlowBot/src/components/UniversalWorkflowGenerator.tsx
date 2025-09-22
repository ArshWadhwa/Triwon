import React, { useState, useRef } from 'react';
import { 
  Bot, Zap, Upload, FileText, ArrowRight, Loader2, CheckCircle, 
  AlertCircle, Copy, Download, Eye, EyeOff, Plus, Trash2 
} from 'lucide-react';

interface WorkflowStep {
  step_type: 'trigger' | 'action';
  service_name: string;
  event_type: string;
  configuration: Record<string, any>;
}

interface UniversalWorkflow {
  name: string;
  description: string;
  steps: WorkflowStep[];
}

interface WorkflowResponse {
  success: boolean;
  workflow?: UniversalWorkflow;
  workflow_id?: string;
  error?: string;
}

const UniversalWorkflowGenerator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'upload'>('generate');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [workflow, setWorkflow] = useState<UniversalWorkflow | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate workflow from text prompt
  const generateWorkflow = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setWorkflow(null);

    try {
      const response = await fetch('http://localhost:8000/api/generate-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          user_id: 'demo-user-123' // Replace with actual user ID
        }),
      });

      const data: WorkflowResponse = await response.json();

      if (data.success && data.workflow) {
        setWorkflow(data.workflow);
        setWorkflowId(data.workflow_id || null);
      } else {
        setError(data.error || 'Failed to generate workflow');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  // Upload JSON file
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsGenerating(true);
    setError(null);
    setWorkflow(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', 'demo-user-123'); // Replace with actual user ID

      const response = await fetch('http://localhost:8000/api/upload-workflow-file', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.workflow) {
        setWorkflow(data.workflow);
        setWorkflowId(data.workflow_id || null);
      } else {
        setError(data.error || 'Failed to upload workflow');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // Utility functions
  const copyToClipboard = () => {
    if (workflow) {
      navigator.clipboard.writeText(JSON.stringify(workflow, null, 2));
    }
  };

  const downloadJson = () => {
    if (workflow) {
      const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${workflow.name.replace(/\s+/g, '_').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getStepIcon = (stepType: string) => {
    return stepType === 'trigger' ? '⚡' : '⚙️';
  };

  const getStepColor = (stepType: string) => {
    return stepType === 'trigger' 
      ? 'from-blue-500 to-blue-600' 
      : 'from-purple-500 to-purple-600';
  };

  const getServiceEmoji = (serviceName: string) => {
    const serviceEmojis: Record<string, string> = {
      gmail: '📧', slack: '💬', discord: '🎮', notion: '📝',
      reddit: '🔴', twitter: '🐦', openrouter: '🤖', gemini: '✨',
      webhook: '🔗', scheduler: '⏰', sheets: '📊', trello: '📋'
    };
    return serviceEmojis[serviceName] || '🔧';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Universal Workflow Creator</h1>
        </div>
        <p className="text-gray-600 max-w-3xl mx-auto">
          Create workflows by describing them in plain English or uploading JSON files. 
          Both methods use the same universal schema for maximum compatibility.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="bg-gray-100 rounded-xl p-1 flex">
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 ${
              activeTab === 'generate'
                ? 'bg-white text-purple-600 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI Generate</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 ${
              activeTab === 'upload'
                ? 'bg-white text-purple-600 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload JSON</span>
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'generate' ? (
        // AI Generation Tab
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <Bot className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Describe Your Workflow</h3>
          </div>
          
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: When I get a Gmail with keyword 'project', summarize it with AI and create a Notion page..."
            className="w-full h-32 p-4 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={isGenerating}
          />
          
          <button
            onClick={generateWorkflow}
            disabled={isGenerating || !prompt.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-6 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Workflow...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                <span>Generate Workflow</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      ) : (
        // File Upload Tab
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <FileText className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Upload JSON Workflow</h3>
          </div>
          
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isGenerating}
            />
            
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700 mb-2">Upload Workflow JSON</h4>
            <p className="text-gray-500 mb-4">Choose a JSON file that follows our universal schema</p>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isGenerating}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {isGenerating ? 'Uploading...' : 'Choose File'}
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <h3 className="text-red-800 font-semibold">Error</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Success Result */}
      {workflow && (
        <div className="space-y-6">
          {/* Workflow Header */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <h2 className="text-2xl font-bold text-gray-900">{workflow.name}</h2>
            </div>
            <p className="text-gray-700 mb-4">{workflow.description}</p>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowJson(!showJson)}
                className="flex items-center space-x-2 bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                {showJson ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showJson ? 'Hide' : 'View'} JSON</span>
              </button>
              <button
                onClick={copyToClipboard}
                className="flex items-center space-x-2 bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>Copy JSON</span>
              </button>
              <button
                onClick={downloadJson}
                className="flex items-center space-x-2 bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Visual Workflow Steps */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Workflow Steps</h3>
            <div className="space-y-4">
              {workflow.steps.map((step, index) => (
                <div key={index} className="relative">
                  {/* Connection Line */}
                  {index < workflow.steps.length - 1 && (
                    <div className="absolute left-6 top-16 w-0.5 h-8 bg-gray-300 z-0"></div>
                  )}
                  
                  {/* Step Card */}
                  <div className="relative z-10 flex items-start space-x-4 bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                    <div className={`w-12 h-12 bg-gradient-to-r ${getStepColor(step.step_type)} rounded-xl flex items-center justify-center text-lg shadow-lg flex-shrink-0`}>
                      {getStepIcon(step.step_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-semibold uppercase">
                          {step.step_type}
                        </span>
                        <span className="text-lg">{getServiceEmoji(step.service_name)}</span>
                        <span className="text-purple-600 font-semibold">{step.service_name}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-600">{step.event_type}</span>
                      </div>
                      
                      {Object.keys(step.configuration).length > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Configuration:</span>
                          <pre className="text-xs text-gray-700 mt-1 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(step.configuration, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* JSON View */}
          {showJson && (
            <div className="bg-gray-900 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Universal Schema JSON</h3>
              <pre className="text-green-400 text-sm overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(workflow, null, 2)}
              </pre>
            </div>
          )}

          {/* Success Message */}
          {workflowId && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <p className="text-blue-800">
                ✅ Workflow saved successfully! 
                <span className="font-mono text-sm text-blue-600 ml-2">ID: {workflowId}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Example Prompts */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Example Prompts</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            "When I get Gmail with keyword 'project', summarize with AI and create Notion page",
            "Send Slack message when new Reddit post in r/programming has 'tutorial' keyword",
            "Every Monday at 9 AM, fetch sales data and email weekly report to team",
            "When webhook receives customer signup, send welcome email and add to CRM"
          ].map((example, index) => (
            <button
              key={index}
              onClick={() => {
                setActiveTab('generate');
                setPrompt(example);
              }}
              className="text-left p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200"
            >
              <p className="text-gray-700 text-sm">{example}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Schema Information */}
      <div className="bg-blue-50 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Universal Schema Format</h3>
        <div className="bg-blue-900 rounded-xl p-4">
          <pre className="text-blue-100 text-sm overflow-x-auto">
{`{
  "name": "Workflow name",
  "description": "What this workflow does", 
  "steps": [
    {
      "step_type": "trigger | action",
      "service_name": "gmail | slack | notion | reddit | ...",
      "event_type": "new_email | send_message | create_page | ...",
      "configuration": {
        "service_specific_settings": "values"
      }
    }
  ]
}`}
          </pre>
        </div>
        <p className="text-blue-700 text-sm mt-3">
          This universal format works for both AI generation and JSON uploads, ensuring consistency across all workflows.
        </p>
      </div>
    </div>
  );
};

export default UniversalWorkflowGenerator;
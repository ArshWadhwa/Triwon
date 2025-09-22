import React from 'react';

export interface ConversationContext {
  step: 'initial' | 'gathering_requirements' | 'clarifying_details' | 'generating_workflow' | 'reviewing_workflow' | 'finalizing';
  workflowData: {
    purpose?: string;
    trigger?: string;
    actions?: string[];
    services?: string[];
    frequency?: string;
  };
  clarificationNeeded?: string[];
}

export const ConversationQuestions = {
  initial: [
    "What task would you like to automate?",
    "What repetitive process takes up your time?",
    "Which apps do you want to connect together?"
  ],
  
  gathering_requirements: [
    "What should trigger this automation?",
    "What actions should happen when triggered?", 
    "Which services or apps are involved?",
    "How often should this run?"
  ],
  
  clarifying_details: [
    "Could you provide more details about the trigger?",
    "What specific actions should the workflow perform?",
    "Are there any conditions or filters to apply?",
    "Should there be any notifications or alerts?"
  ],
  
  reviewing_workflow: [
    "Does this workflow look correct?",
    "Would you like to modify any steps?",
    "Should we add any additional actions?",
    "Are you ready to save this workflow?"
  ]
};

export const analyzeUserInput = (input: string, context: ConversationContext): ConversationContext => {
  const lowerInput = input.toLowerCase();
  
  // Detect services mentioned
  const services = [];
  if (lowerInput.includes('gmail') || lowerInput.includes('email')) services.push('gmail');
  if (lowerInput.includes('slack')) services.push('slack');
  if (lowerInput.includes('notion')) services.push('notion');
  if (lowerInput.includes('reddit')) services.push('reddit');
  if (lowerInput.includes('ai') || lowerInput.includes('summarize')) services.push('openrouter');
  
  // Detect triggers
  let trigger = '';
  if (lowerInput.includes('when i get') || lowerInput.includes('new email')) trigger = 'email_received';
  if (lowerInput.includes('every') || lowerInput.includes('schedule')) trigger = 'scheduled';
  if (lowerInput.includes('webhook') || lowerInput.includes('api')) trigger = 'webhook';
  
  return {
    ...context,
    workflowData: {
      ...context.workflowData,
      services: [...(context.workflowData.services || []), ...services],
      trigger: trigger || context.workflowData.trigger,
      purpose: input
    }
  };
};

export const generateSmartResponse = (context: ConversationContext): string => {
  const { step, workflowData } = context;
  
  switch (step) {
    case 'initial':
      return "Great! I can help you create that automation. Let me gather some details first...";
      
    case 'gathering_requirements':
      if (!workflowData.trigger) {
        return "What should trigger this automation? For example:\n• When you receive an email\n• On a schedule (daily, weekly)\n• When a webhook is called\n• When something happens in an app";
      }
      if (!workflowData.services || workflowData.services.length < 2) {
        return "Which apps or services should be involved? I can connect things like Gmail, Slack, Notion, Reddit, AI services, and many more.";
      }
      break;
      
    case 'clarifying_details':
      return "Let me clarify a few details to make this workflow perfect for you...";
      
    case 'generating_workflow':
      return "Perfect! I have enough information. Let me create your workflow now...";
      
    default:
      return "I'm here to help! What would you like to automate?";
  }
  
  return "Could you tell me more about what you'd like to automate?";
};

// Update the workflow display in the messages map
{message.workflow && (
  <div className="mt-4 p-4 bg-gray-700/50 rounded-xl border border-gray-600">
    <div className="flex items-center space-x-2 mb-3">
      <Zap className="w-4 h-4 text-yellow-400" />
      <span className="font-semibold text-yellow-400">Generated Workflow</span>
      <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">
        Ready to Download
      </span>
    </div>
    
    <div className="text-sm space-y-2 mb-4">
      <div><strong>Name:</strong> {message.workflow.name}</div>
      <div><strong>Description:</strong> {message.workflow.description}</div>
      <div><strong>Steps:</strong> {message.workflow.steps?.length || 0}</div>
    </div>
    
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => downloadWorkflow(message.workflow)}
        className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors flex items-center space-x-1"
      >
        <Download className="w-4 h-4" />
        <span>Download JSON</span>
      </button>
      
      <button
        onClick={() => copyWorkflow(message.workflow)}
        className="px-3 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition-colors flex items-center space-x-1"
      >
        <Copy className="w-4 h-4" />
        <span>Copy JSON</span>
      </button>
      
      <button
        onClick={() => saveWorkflow()}
        className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors flex items-center space-x-1"
      >
        <CheckCircle className="w-4 h-4" />
        <span>Save to Dashboard</span>
      </button>
      
      <button
        onClick={() => {
          const jsonWindow = window.open('', '_blank');
          jsonWindow?.document.write(`
            <html>
              <head><title>${message.workflow.name} - JSON Preview</title></head>
              <body style="font-family: monospace; white-space: pre-wrap; padding: 20px; background: #1a1a1a; color: #00ff00;">
                ${JSON.stringify(message.workflow, null, 2)}
              </body>
            </html>
          `);
        }}
        className="px-3 py-2 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors flex items-center space-x-1"
      >
        <Eye className="w-4 h-4" />
        <span>Preview JSON</span>
      </button>
    </div>
    
    {/* Quick Import Instructions */}
    <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
      <p className="text-xs text-blue-300">
        💡 <strong>Import Instructions:</strong> Download the JSON file and upload it to any Autofy dashboard 
        using the "Upload JSON" feature in the Universal Workflow Generator.
      </p>
    </div>
  </div>
)}
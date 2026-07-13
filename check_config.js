import { prebuiltAppConfig } from '@mlc-ai/web-llm';
const smol = prebuiltAppConfig.model_list.find(m => m.model_id === 'SmolLM2-135M-Instruct-q0f16-MLC');
console.log(JSON.stringify(smol, null, 2));

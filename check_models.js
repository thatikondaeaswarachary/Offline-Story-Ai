import { prebuiltAppConfig } from '@mlc-ai/web-llm';
prebuiltAppConfig.model_list.forEach(m => console.log(m.model_id));

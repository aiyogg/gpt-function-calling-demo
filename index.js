import { config } from 'dotenv';
import { Configuration, OpenAIApi, } from 'openai';
config();
const main = async () => {
    var _a, _b, _c, _d, _e, _f;
    const configuration = new Configuration({
        basePath: process.env.OPENAI_API_ENDPOINT,
        apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);
    const messages = [
        {
            role: 'user',
            content: 'What is the weather like in San Francisco?',
        },
    ];
    const functionsSchema = [
        {
            name: 'get_current_weather',
            description: 'Get the current weather',
            parameters: {
                type: 'object',
                properties: {
                    location: {
                        type: 'string',
                        description: 'The city and state, e.g. San Francisco, CA',
                    },
                    format: {
                        type: 'string',
                        enum: ['celsius', 'fahrenheit'],
                        description: 'The temperature unit to use. Infer this from the users location.',
                    },
                },
                required: ['location', 'format'],
            },
        },
    ];
    const functions = {
        get_current_weather: async (args) => {
            // call weather api
            return `the ${args.location} is 75 ${args.format} and sunny`;
        },
    };
    const getCompletion = async (messages) => {
        const response = await openai.createChatCompletion({
            model: 'gpt-3.5-turbo-16k',
            messages,
            functions: functionsSchema,
            temperature: 0,
        });
        return response;
    };
    let response;
    while (true) {
        response = await getCompletion(messages);
        if (response.data.choices[0].finish_reason === 'stop') {
            console.log((_a = response.data.choices[0].message) === null || _a === void 0 ? void 0 : _a.content);
            break;
        }
        else if (response.data.choices[0].finish_reason === 'function_call') {
            const fnName = (_d = (_c = (_b = response.data.choices[0].message) === null || _b === void 0 ? void 0 : _b.function_call) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : '';
            const args = (_f = (_e = response.data.choices[0].message) === null || _e === void 0 ? void 0 : _e.function_call) === null || _f === void 0 ? void 0 : _f.arguments;
            // console parameters
            console.log(`Function call: ${fnName}, Arguments: ${args}`);
            const fn = functions[fnName];
            const result = await fn(JSON.parse(args !== null && args !== void 0 ? args : '{}'));
            console.log(`Calling Function ${fnName} Result: ` + result);
            messages.push({
                role: 'assistant',
                // @ts-ignore
                content: null,
                function_call: {
                    name: fnName,
                    arguments: args,
                },
            });
            messages.push({
                role: 'function',
                name: fnName,
                content: JSON.stringify({ result: result }),
            });
        }
    }
};
main();

import { config } from 'dotenv'
import {
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum,
  Configuration,
  OpenAIApi,
} from 'openai'

config()

const main = async () => {
  const configuration = new Configuration({
    basePath: process.env.OPENAI_API_ENDPOINT,
    apiKey: process.env.OPENAI_API_KEY,
  })
  const openai = new OpenAIApi(configuration)

  const messages: {
    role: ChatCompletionRequestMessageRoleEnum
    content: string | undefined
    function_call?: any
    name?: string
  }[] = [
    {
      role: 'user',
      content: 'What is the weather like in San Francisco?',
    },
  ]

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
            description:
              'The temperature unit to use. Infer this from the users location.',
          },
        },
        required: ['location', 'format'],
      },
    },
  ]

  interface FunctionMap {
    [key: string]: (args: any) => Promise<any>
  }

  const functions: FunctionMap = {
    get_current_weather: async (args: { location: string; format: string }) => {
      // call weather api
      return `the ${args.location} is 75 ${args.format} and sunny`
    },
  }

  const getCompletion = async (messages: ChatCompletionRequestMessage[]) => {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo-16k',
      messages,
      functions: functionsSchema,
      temperature: 0,
    })

    return response
  }
  let response

  while (true) {
    response = await getCompletion(messages)

    if (response.data.choices[0].finish_reason === 'stop') {
      console.log(response.data.choices[0].message?.content)
      break
    } else if (response.data.choices[0].finish_reason === 'function_call') {
      const fnName = response.data.choices[0].message?.function_call?.name ?? ''
      const args = response.data.choices[0].message?.function_call?.arguments

      // console parameters
      console.log(`Function call: ${fnName}, Arguments: ${args}`)

      const fn = functions[fnName]
      const result = await fn(JSON.parse(args ?? '{}'))

      console.log(`Calling Function ${fnName} Result: ` + result)

      messages.push({
        role: 'assistant',
        // @ts-ignore
        content: null,
        function_call: {
          name: fnName,
          arguments: args,
        },
      })

      messages.push({
        role: 'function',
        name: fnName,
        content: JSON.stringify({ result: result }),
      })
    }
  }
}

main()

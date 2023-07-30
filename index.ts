import { config } from 'dotenv'
import {
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum,
  Configuration,
  OpenAIApi,
} from 'openai'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

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
      content: '请问夏威夷的天气怎么样？',
    },
  ]

  const paramsSchema = z.object({
    location: z.string().describe('The city and state, e.g. San Francisco, CA'),
    langCode: z
      .enum([
        'ar',
        'bn',
        'bg',
        'zh',
        'zh_tw',
        'cs',
        'da',
        'nl',
        'fi',
        'fr',
        'de',
        'el',
        'hi',
        'hu',
        'it',
        'ja',
        'jv',
        'ko',
        'zh_cmn',
        'mr',
        'pl',
        'pt',
        'pa',
        'ro',
        'ru',
        'sr',
        'si',
        'sk',
        'es',
        'sv',
        'ta',
        'te',
        'tr',
        'uk',
        'ur',
        'vi',
        'zh_wuu',
        'zh_hsn',
        'zh_yue',
        'zu',
      ])
      .describe(
        'The langues code to use for the weather description, e.g. en, es, zh. Its according to users language preference.'
      ),
  })
  const params = zodToJsonSchema(paramsSchema)

  const functionSchema = {
    name: 'get_current_weather',
    description: 'Get the current weather',
    parameters: params,
  }

  interface FunctionMap {
    [key: string]: (args: any) => Promise<any>
  }

  const functions: FunctionMap = {
    get_current_weather: async ({
      location,
      langCode,
    }: z.infer<typeof paramsSchema>) => {
      const res = await fetch(
        `http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${location}&lang=${langCode}`
      )
        .then((res) => res.json())
        .catch((err) => {
          console.log(err)
          return null
        })
      return res?.current ?? 'No weather data found'
    },
  }

  const getCompletion = async (messages: ChatCompletionRequestMessage[]) => {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo-16k',
      messages,
      functions: [functionSchema],
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

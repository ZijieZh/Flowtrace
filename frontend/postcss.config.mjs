import tailwindcss from '@tailwindcss/postcss'
import postcssPxToRem from 'postcss-pxtorem'

export default {
  plugins: [
    tailwindcss,
    postcssPxToRem({
      rootValue: 16,
      propList: ['*'],
      selectorBlackList: [],
      minPixelValue: 2,
    }),
  ],
}

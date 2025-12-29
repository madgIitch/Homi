// .eslintrc.js  
module.exports = {  
  root: true,  
  extends: '@react-native',  
  rules: {  
    'react/no-unstable-nested-components': ['error', { allowAsProps: true }]  
  },  
  overrides: [  
    {  
      files: ['src/screens/**/*.{ts,tsx}'],  
      rules: {  
        'no-restricted-syntax': [  
          'error',  
          {  
            selector:  
              "CallExpression[callee.object.name='StyleSheet'][callee.property.name='create']",  
            message:  
              'Use styles from src/styles/screens instead of StyleSheet.create in screens.',  
          },  
        ],  
      },  
    },  
  ],  
};  

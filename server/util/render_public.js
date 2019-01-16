const ejs = require('ejs')
const serialize = require('serialize-javascript')
// 将JavaScript对象序列化，配合ejs模板引擎使用的
const Helmet = require('react-helmet').default
// 这个组件是用来将组件中定义的title灯内容在服务端渲染的时候就渲染到页面上
const asyncBootstrap = require('react-async-bootstrapper')
// 用来异步操作修改store中的数据，在组件里面调用asyncBoostrap方法，
// 会优先执行该方法里面的内容，我们可以在组件的这个方法里面修改服务器里面store的变量的值
// ，然后才会执行then里面的内容


const {SheetsRegistry}= require('jss')
const createGenerateClassName= require('@material-ui/core/styles/createGenerateClassName').default
const colors = require('@material-ui/core/colors')
const createMuiTheme = require('@material-ui/core/styles/createMuiTheme').default

const ReactDomServer = require('react-dom/server')


const getStoreState = (stores)=>{
    return Object.keys(stores).reduce((result,storeName)=>{
        result[storeName] = stores[storeName].toJson()
        return result
    },{})
}
// 这个方法是拿到是服务端store实例中的变量值，因为我们先调用的asyncBootstrap方法，
// 所以此时拿到的结果是已经改变的store，是服务器的store变量的最终结果，
// 直接把这个数据传递到客户端，利用这个数据去修改客户端的store达到数据的统一


module.exports = (bundle,template,req,res) =>{
    return new Promise((resolve,reject)=>{

        const sheetsRegistry = new SheetsRegistry()
        const generateClassName=createGenerateClassName()
        const sheetsManager = new Map()
        const theme = createMuiTheme({
            palette:{
                type:'light'
            },
            typography:{
                useNextVariants:true
            }

        })

        const createStoreMap = bundle.createStoreMap
        // 从bundle中拿到createStoreMap方法

        const createApp = bundle.default
        // 创建app的方法
        const routerContext ={}
        const stores = createStoreMap()
        const app = createApp(stores,routerContext,req.url,sheetsRegistry,generateClassName,theme,sheetsManager)





        asyncBootstrap(app).then(()=>{
            const helmet = Helmet.rewind()
            // 将title等SEO标签从客户端获取到并在服务器渲染的时候就渲染进去的工具
            const state = getStoreState(stores)
            // 调用上面的方法，将stores获取到，并在后面的方法中传递到客户端，
            // 以便客户端拿到store之后进行数据同步
            const content = ReactDomServer.renderToString(app)
            // 在renderToString之后才会拿到routerContext.url

            if (routerContext.url){
                // 当客户端的路由有redirect的时候，在服务器渲染的时候会在staticRouter
                // 的context上增加一个url属性
                res.status(302).setHeader("Location",routerContext.url)
                // 302是重定向的头，方便我们查看调试，通过设置header的Location属性，
                // 让浏览器自动跳转到url上
                res.end()
                // 结束请求
                return
                // 到这程序终止0，因为我们已经进行了路由跳转，会重新发一个请求到客户端，
                // 新的路由中就不会再包含redirect，就可以直接执行后面的代码，
                // 如果不return，在路由跳转之后还继续渲染的是没跳转前的页面，就会报错
            }
            // 判断客户端的代码中是否有redirect，如果有的话在服务渲染的时候就进行跳转


            console.log(stores.state.name)
            const html = ejs.render(template,{
                appString:content,
                initialState:serialize(state),
                meta:helmet.meta.toString(),
                title:helmet.title.toString(),
                link:helmet.link.toString(),
                style:helmet.style.toString(),
                materialCss:sheetsRegistry.toString(),

            })

            res.send(html)
            resolve()
        }).catch(reject)
    })
}

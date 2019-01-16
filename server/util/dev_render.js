const path = require('path')

const axios = require('axios')

const renderPublic = require('./render_public')

const proxyMiddle = require('http-proxy-middleware')
// 这个工具是服务器代理，将某个url转到另外一个url路径下


const webpack = require('webpack')
const configRender = require('../../build/webpack.config.render')
// 将config.server.js导入进来，因为我们要使用webpack在服务器中重启动一个webpack的服务，
// 然后通过读取webpack打包的结果获取到实时的server包
const MemoryFs = require('memory-fs')
// memory-fs这个工具能帮助我们在内存中直接读取文件，也可以通过webpack的配置项将其服务限制在内存中


const webpackCompiler = webpack(configRender)
// 使用webpack启动一个server的汇编程序，这个程序会监听他所以来的文件的变化，
// 一旦有变化会重新打包，然后通过watch方法拿到打包好的内容


const mfs = new MemoryFs
webpackCompiler.outputFileSystem = mfs
// 因为我们只是为了拿到webpack在内存中打包好的文件，而不需要其他操作，
// 所以我们使用memory-fs将weback服务限制在服务器内，而不是写到硬盘上，
// 从而提高我们的工作效率（内存读取文件速度比硬盘快很多，而且还不用占硬盘空间）

let serverBundle
// 定义一个全局变量将函数里面的值拿出来

const NativeModule = require('module')
const vm = require('vm')
const getModuleFromString = (bundle,filename)=>{
    const m = {exports:{}}
    const wrapper = NativeModule.wrap(bundle)
    const script = new vm.Script(wrapper,{
        filename:filename,
        displayErrors:true,
    })

    const result = script.runInThisContext()
    result.call(m.exports,m.exports,require,m)
    return m
}
// 这一块代码作用是将webpack服务器中的导出来的代码转换成我们
// 能在node服务器中顺利使用的代码，内部的逻辑比较乱，
// 在这个情景下直接用就行了


webpackCompiler.watch({},(err,stats) =>{
    if(err) throw err

    const bundlePath = path.join(
        configRender.output.path,
        configRender.output.filename
    )
    // 获取server_entry.js在webpack服务器中的位置
    const bundle = mfs.readFileSync(bundlePath,'utf-8')
    // 根据文件路径，使用mfs读取内存中的bundle，格式是utf-8（默认内存中的数据格式是二进制）

    const m =getModuleFromString(bundle,'server_entry.js')
    // getModuleFromString这个方法是将已经导出来的内存中的代码转化成
    // 可以直接在node服务器中顺利使用的代码
    serverBundle = m.exports
})


const getTemplate = ()=>{
    return new Promise((resolve,reject)=>{
        axios.get('http://localhost:9999/public/server.ejs')
            .then(res =>{
                resolve(res.data)
            })
            .catch(reject)
    })
}
// 使用axios获取到本地webpack服务器中的template，Promise是使用异步的方法获取，
// 这样我们就能拿到最新的template


module.exports = function (app) {
    app.use('/public', proxyMiddle({
        target:'http://localhost:9999'
    }))
    // 使用http代理，将'/public'路径转发到8888端口

    app.get('*',(req,res,next)=>{
        getTemplate().then(template=>{
            return renderPublic(serverBundle,template,req,res)
            // serverRender的结果是一个promise，所以我们要想catch到必须要return
        }).catch(next)
    })
}


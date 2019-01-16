const path = require('path')
const fs = require('fs')

const bodyParser = require('body-parser')
const session = require('express-session')

const favicon = require('serve-favicon')

const express = require('express')

const isDev = process.env.NODE_ENV === 'development'

const renderPublic = require('./util/render_public')

const app = express()


app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:false}))
app.use(session({
    maxAge:10*60*1000,
    name:'token',
    resave:false,
    saveUninitialized:false,
    secret:'token protect'
}))

app.use('/api/login',require('./util/login_proxy'))
// 如果请求路径是/api/login，那么就将请求转到login_proxy.js处理
app.use('/api',require('./util/proxy'))

app.use(favicon(path.resolve(__dirname,'../favicon.ico')))


if(!isDev){
    app.use('/public',express.static(path.resolve(__dirname,'../dist')))
    const renderEntry = require('../dist/render_entry')
    const renderHtml = fs.readFileSync(path.resolve(__dirname,'../dist/server.ejs'),'utf8')


    app.get('*',(req,res,next)=>{
        renderPublic(renderEntry,renderHtml,req,res).catch(next)
    })
}else {
    const devRender = require('./util/dev_render')
    devRender(app)
}

app.use(function (error,req,res,next) {
    console.log(error)
    res.status(500).send(error)
})

const host = process.env.HOST || '0.0.0.0'
const port = process.env.PORT || 9000

app.listen(port,host,()=>{
    console.log('server is started in 9000')
})

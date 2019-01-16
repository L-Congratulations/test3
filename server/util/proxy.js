const axios = require('axios')
const queryString = require('query-string')

// const baseUrl = 'http://rap2api.taobao.org/app/mock/119140/api'
const baseUrl = 'https://cnodejs.org/api/v1'

module.exports = (req,res,next)=>{
    const path = req.path
    // 我们使用的是callback方式，可以定义多个路由规则，所以我们先从req中拿到客户端请求中的url
    const user = req.session.user || {}
    // 我们要判断用户是否已经登录，因为这涉及到用户访问权限和当前账号的头像昵称等信息，
    // 通过session中的数据来判断，为了防止user根本就没有而造成服务器报错，所以添加一个{}作为默认值

    const needToken = req.query.needToken
    // 定义一个变量，通过客户端来控制浏览的信息是否需要登录才能访问，
    // 如果需要浏览才能访问则需要添加一个needToken参数，然后我们再从session中读取看是否有token，
    // 如果有则返回对应想信息，如果没有提示用户需要登录才能访问，
    // req.query是包含在路由中每个查询字符串参数属性的对象，如果没有默认为{}，
    // 在这用来判断路由中是否存在needToken这个参数

    if(needToken && !user.token){
        res.status(401).send({
            success:false,
            msg:'需要登录才能访问'
        })
    }
    // 通过判断客户端发送的信息和服务器session中的数据来确定是否给客户端返回信息

    // const query = Object.assign(req.query,req.needToken,{
    //     accesstoken:(needToken && req.method === 'GET') ? user.accesstoken : ''
    // })
    // if(query.needToken) delete query.needToken
    // 因为我们不确定客户端传过来的信息是否包含query（如果是get请求是可能存在query参数的）
    // 而且我们规定如果用户登录的信息需要登录才能访问时需要传递一个自定义的needToken参数来说明，
    // 所以query需要传，而且我们不能直接将客户端传递过来的的参数直接发送给真实接口，
    // 所以我们要在这对query进行加工，增加或者删除属性，也就是重新定义。先深拷贝，然后加工，
    // 将加工好的传递.传递query的参数是通过param:query方式传递的，
    // 如果get请求方法中需要我们传递token，那么我们就从session中取出并传递，如果不需要那么就传递一个空字符串


    const data =queryString.stringify(
        Object.assign({},req.body,{
            accesstoken:(needToken && req.method === 'POST') ? user.accesstoken : ''
        })
    )
    // data是post的请求体，也就是post请求的请求参数，我们在这通过重新定义将参数加进去，
    // 即使请求的接口不需要这个参数的话也没关系,使用queryString方法将json格式的数据转化成formData格式
    // 将{'accesstoken':'xxxxxxx'}转化成了：'accesstoken=xxxxxx',通过三元语句判断，
    // 如果请求的方法是post，并且需要传递accesstoken，那么就从session中取出token并赋值，如果不需要就传递一个空字符串
    //

    // console.log(query)
    // console.log(data)
    console.log('-------------------------')
    console.log(`${baseUrl}${path}`)
    console.log(req.query)
    console.log(req.method)
    console.log(data)
    console.log('------------------------')
    axios(`${baseUrl}${path}`,{
        method:req.method,
        params:req.query,
        data:data,
        headers:{
            'Content-Type':'application/x-www-form-urlencoded'
            // axios默认发送的是application格式的数据，而有的接口只能接收formData格式的数据，
            // 为了防止出现一些问题，我们把发送的数据格式全都使用formData发送
        }
    })
        .then(response =>{
            if(response.status === 200){
                res.send(response.data)
            }else {
                res.status(response.status).send(response.data)
            }
        })
        .catch(err =>{
            if(err.response){
                res.status(500).send(err.response.data)
            }else {
                next(err)
                // res.status(500).send({
                //     sucess:false,
                //     msg:'未知错误'
                // })
                // 上面两种处理报错的方法二选一
            }
        })

}

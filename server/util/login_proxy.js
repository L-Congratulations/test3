const router = require('express').Router()

const axios = require('axios')

const baseUrl = 'http://rap2api.taobao.org/app/mock/119140/api/list'

router.post('/login',(req,res,next)=>{
    axios.post(`${baseUrl}/login`,{
        userName:req.body.userName,
        password:req.body.password
        // 向真实接口需要发送的参数
    })
        .then(response=>{
            if(response.status === 200 && response.data.success){
                req.session.user={
                    accessToken:response.data.accessToken,
                    loginName:response.data.loginname,
                    avatarUrl:response.data.avatar_url,
                    id:response.data.id
                }
                // 首先将请求返回的正确数据存放到服务器的session中，方便以后调用，这个session的名字叫user，是一个对象
                res.json({
                    success:true,
                    data:response.data
                })
                // 将真实接口返回的结果返回给客户端
            }
        })
        .catch(err =>{
            if (err.response){
                res.json({
                    success:false,
                    data:err.response.data
                })
                // err.response的意思是服务器有返回内容，不是服务器错误，
                // 是我们的业务逻辑出现了问题，否则的话我们就将错误信息使用next方法抛给全局的错误去处理
            }else {
                next(err)
            }
        })

})

module.exports = router

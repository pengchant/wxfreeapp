var appInstance = getApp();

var util = require("../../utils/util.js");

Page({
    data: {
        isShadow: false,
        textValue: ''
    },
    getTextValue: function (e) {
        //获取文本域中输入的值值
        var textValue = e.detail.value;
        console.log("文本域中的值: " + textValue);
        this.setData({
            textValue: textValue
        })
    },
    cancelShadow: function () {
        this.setData({
            isShadow: false
        })
    },
    checkCaseByMobile: function (e) {
        var that = this;
        //电话号码
        var mobile = that.data.textValue;
        console.log("电话号码: " + mobile);
        wx.request({
            url: 'https://'+appInstance.globalData.domainUrl+'/getmobile.mo', //获取所有的聊天记录
            /**
            * 不管怎么设置header[即使设置application/x-www-form-urlencoded],
            * 这货都会在最后加上application/json. 
            */
            header: {
                'content-type': "application/x-www-form-urlencoded"
            },
            method: 'POST',
            data: {
                mobile: mobile
            }, 
            success: function (res) {
                var attr = JSON.stringify(res.data);
                console.log("案件信息: " + object);
                var object = res.data[0];
                var msg = object.msg;
                console.log("是否存在正在查看的案件: " + msg);
                var caseid = object.caseid;
                console.log("案件信息ID：　" + caseid);
                if (msg == '1') {
                    // 设置全局变量
                    appInstance.globalData.caseId = caseid;
                    appInstance.globalData.username = mobile;
                    // 解锁websocket
                    appInstance.globalData.lock = false;
                    console.log("=============>解锁websocket.....");
                    console.log("切换到聊天界面!...");
                    // 开始打开webscoket
                    appInstance.connectToWebSocket(caseid, mobile, appInstance);
                   
                    wx.redirectTo({
                        url: '/pages/index/index?caseId=' + caseid + '&username=' + mobile
                    })

                } else {
                    that.setData({
                        isShadow: true
                    })
                }

            }, 
            fail:function(res){
                console.error(res);
            },
            complete: function (res) {
                if (res == null || res.data == null) {
                    console.error("网络请求失败!");
                }
            }
        });
    }

})
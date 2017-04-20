//app.js  

App({
  globalData: {
    domainUrl: 'gs.handkoologin.com',// 项目域名
    hasLogin: false,
    AppID: 'wx63b7015418f7ac94',// APPid
    AppSecret: 'baaff96255cb3960648454471f8e226f',
    caseId: '',
    username: '', 
    lock: false,// 是否锁定socket
    allSocketTimer: []//所有的socket
  },
  onLaunch: function () {

  },
  onShow: function () {
    /**
     * 页面显示的时候的逻辑
     */
    console.log('App Show');

    // 关闭socket连接
    wx.onSocketClose(function () {
      console.log("app.js--->socket连接被关闭...");
    })
  },
  onHide: function () {
    console.log('App Hide');
    // 如果程序关闭了就关闭socket连接
    wx.onSocketOpen(function () {
      wx.closeSocket()
    });
  },
  socketClosedCurr: sockeHandler,// 页面加载异常监听
  connectToWebSocket: openWebSocket// 连接webocket
})

/**
 * 开启websocket连接
 */
function openWebSocket(caseId, username, current) {
  // 如果不是锁定的状态
  if (current.globalData.lock == false) {
    console.log("websocket未曾被锁定...");
    // 清除时间
    if (current.globalData.allSocketTimer != undefined) {
      for (let i = 0; i < current.globalData.allSocketTimer.length; i++) {
        clearInterval(current.globalData.allSocketTimer[i]);
      }
    }
    console.log("清空所有计时器....");
    var wssUrl = 'wss://' +  current.globalData.domainUrl + '/chat?username=' + username + '&caseId=' + caseId + '&isweixin=0';
    console.log("======>微信的url为:" + wssUrl);
    wx.connectSocket({
      url: wssUrl
    });
    console.log("连接websocket");
    wx.onSocketOpen(function (res) {
      console.log('WebSocket连接已打开！');
      wx.sendSocketMessage({
        data: "@websocket#check*online"
      });
      var t = setInterval(function () {
        try {
          console.log("app.js...发送websocket心跳...");
          wx.sendSocketMessage({
            data: "@websocket#check*online"
          });
        } catch (e) {
          console.log(e);
        }
      }, 5000);
      // 设置全局变量
      current.globalData.allSocketTimer.push(t);
    });
  } else {
    console.log("websocket被锁定....");
  }

}


/**
 *异常关闭socket的消息监听
 */
function sockeHandler(current, res) {
  try {
    // 监听听到{"Flag":"6"}
    // 在这里关闭所有的timer:
    var flag = JSON.parse(res.data);
    if (flag.Flag == '6') {
      // 关闭websocket 
      wx.closeSocket();
      console.log("由于在其他地方登陆被迫下线...");
      // 清除时间
      if (current.globalData.allSocketTimer != undefined) {
        for (let i = 0; i < current.globalData.allSocketTimer.length; i++) {
          clearInterval(current.globalData.allSocketTimer[i]);
        }
      }
      console.log("清除计时器完毕...");
      // 锁定lock（不连接socket）
      current.globalData.lock = true;
      console.log("websocket被锁定===============>");
      wx.showModal({
        title: '提示',
        content: '账号已在其他地方登陆',
        success: function (res) {
          if (1) {
            // 跳转到开始页面:
            wx.redirectTo({
              url: '../../pages/mobile/mobile'
            })
          }
        }
      })
    }
  } catch (e) {
  }

}



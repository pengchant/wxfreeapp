//定义全局变量
var messageList = [];
var socketOpen = false;
var appInstance = getApp();


//获取日期
var util = require('../../utils/util.js');

Page({
    data: {
        voicePath: '',
        scrollHeight: "80%",
        lastX: 0,
        lastY: 0,
        scrollTopVal: '',
        turn: 0,// 标记手势滑动的方向：1:想右-1向左，0：无滑动
        isClickPlus: false,
        isShadow: false,
        textValue: '',
        socketOpen: false,
        lastVisitTime: '', //上次访问最后一条记录的时间
        messageList: [],
        caseId: appInstance.globalData.caseId //案件ID 
    },
    // 点击
    handletouchtart: function (event) {
        this.data.turn = 0;// 清空    
        this.data.lastX = event.changedTouches[0].clientX;
        this.data.lastY = event.changedTouches[0].clientY;
    },
    // 结束点击
    handletouchend: function (event) {
        // 获取坐标点的位置
        let currentX = event.changedTouches[0].clientX;
        let currentY = event.changedTouches[0].clientY;
        let _x = (currentX - this.data.lastX);
        let _y = (currentY - this.data.lastY);
        _y = (_y < 0) ? (-1) * _y : _y;
        // 向左滑动:如果x方向上偏移200个像素，y方向上下浮动控制在50之内认为向左滑动 
        if (((-1) * _x) > 200 && (_y < 50)) {
            this.data.turn = -1;
        }
        if (this.data.turn == -1) {// 如果向左滑动（提示是否退出登录）

            wx.showModal({
                title: '提示',
                content: '你确定要退出当前登录吗?',
                success: function (res) {
                    if (res.confirm) {
                        // 在这里退出登录
                        try {
                            // 关闭websocket 
                            wx.closeSocket();
                            console.log("正常下线...");
                            // 清除时间
                            if (appInstance.globalData.allSocketTimer != null) {
                                for (let i = 0; i < appInstance.globalData.allSocketTimer.length; i++) {
                                    clearInterval(appInstance.globalData.allSocketTimer[i]);
                                }
                            }
                            console.log("清除计时器完毕...");
                            // 锁定websocket
                            appInstance.globalData.lock = true;
                            console.log("app中的socket被锁定=====>" + appInstance.globalData.lock);
                            // 清空缓存
                            wx.clearStorageSync();
                            // 跳转到开始页面:
                            wx.redirectTo({
                                url: '../../pages/mobile/mobile'
                            })
                        } catch (e) {
                            console.log(e);
                        }
                    }
                }
            })
        }
        this.data.turn = 0;// 清空
    },
    // 点击事件
    handletap: function (event) {
        this.data.turn = 0;// 清空
    },
    onLoad: function () {
        //   这里要非常注意，微信的scroll-view必须要设置高度才能监听滚动事件，所以，需要在页面的onLoad事件中给scroll-view的高度赋值
        var that = this;
        wx.getSystemInfo({
            success: function (res) {
                console.info("界面高度: " + JSON.stringify(res));
                that.setData({
                    /*scrollHeight:res.windowHeight*/
                });
            }
        });
    },
    // 隐藏掉加号之后的内容
    hiddechatting: function (e) {
        this.setData({
            isClickPlus: false
        });
    },
    onShow: function () { //生命周期函数--监听页面显示
        // 先清空记录
        messageList = [];
        var that = this;
        //案件ID
        var caseId = that.data.caseId;
        /**
         * 监听网页端传过来的客服信息
         */
        wx.onSocketMessage(function (res) {
            console.log('收到服务器内容：' + res.data);
            var json = JSON.parse(res.data);
            var flag = '';
            try {
                // 监听听到{"Flag":"6"}
                // 在这里关闭所有的timer:
                flag = json.Flag;
            } catch (e) {
            }
            if (flag == '6') {// 如果重复登录
                try {
                    // 关闭websocket 
                    wx.closeSocket();
                    console.log("由于在其他地方登陆被迫下线...");
                    // 清除时间
                    if (appInstance.globalData.allSocketTimer != null) {
                        for (let i = 0; i < that.globalData.allSocketTimer.length; i++) {
                            clearInterval(that.globalData.allSocketTimer[i]);
                        }
                    }
                    console.log("清除计时器完毕...");
                    // 锁定websocket
                    appInstance.globalData.lock = true;
                    console.log("app中的socket被锁定=====>" + appInstance.globalData.lock);
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
                } catch (e) {
                    console.log(e);
                }
            } else {
                var msgType = json.msgType;

                if (msgType == '1') {
                    //客服
                    //Flag==0代表文字,Flag==1代表图片
                    var Flag = json.Flag;
                    //聊天时间
                    var chatTime = json.lasterTime;
                    if (Flag == 0) {
                        //添加文字到数组中 
                        var object = createObject(1, json.message, '', 1, chatTime);
                        that.data.messageList.push(object);
                    } else if (Flag == 1) {
                        //斜杠全部替换
                        var imagePath = json.picPath.replace(/\\/g, "/");
                        console.log("斜杠替换后路径: " + imagePath);
                        //映射服务器中图片路径
                        imagePath = "https://" + appInstance.globalData.domainUrl + "/D" + imagePath.substring(imagePath.indexOf(":/") + 1);
                        //添加图片到数组中 
                        var object = createObject(2, '', imagePath, 1, chatTime);
                        that.data.messageList.push(object);
                    }
                }

                //给页面赋值
                that.setData({
                    messageList: that.data.messageList
                });

                var scrollTopVal = that.data.scrollTopVal + 10;
                that.setData({ scrollTopVal: scrollTopVal });
            }
        });
    },

    onReady: function () { //生命周期函数--监听页面初次渲染完成 
        messageList = [];
        var that = this;
        //案件ID
        var caseId = appInstance.globalData.caseId;
        console.log("onReady中的caseId: " + caseId);
        //加载聊天记录
        //var currentTime = util.formatTime2(new Date());
        //console.log("系统当前时间: " + currentTime);
        //获取所有的聊天记录
        wx.request({
            url: 'https://' + appInstance.globalData.domainUrl + '/receiveAll', //获取所有的聊天记录
            /**
            * 不管怎么设置header[即使设置application/x-www-form-urlencoded],
            * 这货都会在最后加上application/json. 
            */
            header: {
                'content-type': "application/x-www-form-urlencoded"
            },
            method: 'POST',
            data: {
                caseId: caseId,
                /**
                dataTime: currentTime,
                */
                dataTime: '',
                startCount: '0',
                msgType: '0'
            },
            success: function (res) {
                //var jsonString = JSON.stringify(res.data);
                console.log("获取当前时间的的20条聊天记录：　" + JSON.stringify(res.data));
                that.setData({
                    lastVisitTime: res.data.dataTime
                });
                //返回的聊天记录
                var dataAttr = res.data.DATA;
                for (var i = dataAttr.length - 1; i >= 0; i--) {
                    var data = dataAttr[i];
                    //聊天时间
                    var chatTime = data.lasterTime;
                    if (data.msgType == '1') {
                        //客服
                        //文字
                        if (data.dataType == '28') {
                            var object = createObject(1, data.content, '', 1, chatTime);
                            that.data.messageList.push(object);
                        } else if (data.dataType == '0') {
                            //图片
                            //斜杠全部替换
                            var imagePath = data.content.replace(/\\/g, "/");
                            console.log("斜杠替换后路径: " + imagePath);
                            //映射服务器中图片路径
                            imagePath = "https://" + appInstance.globalData.domainUrl + "/D" + imagePath.substring(imagePath.indexOf(":/") + 1);
                            var object = createObject(2, '', imagePath, '1', chatTime);
                            that.data.messageList.push(object);
                        }
                    } else {
                        //客户
                        //文字
                        if (data.dataType == '28') {
                            var object = createObject(1, data.content, '', '0', chatTime);
                            that.data.messageList.push(object);
                        } else if (data.dataType == '0') {
                            //图片
                            //斜杠全部替换
                            var imagePath = data.content.replace(/\\/g, "/");
                            console.log("斜杠替换后路径: " + imagePath);
                            imagePath = imagePath.substring(0, imagePath.lastIndexOf(".")) + "_Normal" + imagePath.substring(imagePath.lastIndexOf("."));
                            console.log("加上Normal后的图片路径: " + imagePath);
                            //映射服务器中图片路径
                            imagePath = "https://" + appInstance.globalData.domainUrl + "/D" + imagePath.substring(imagePath.indexOf(":/") + 1);
                            var object = createObject(2, '', imagePath, '0', chatTime);
                            that.data.messageList.push(object);
                        } else if (data.dataType == '6') {
                            //微信小程序语音
                            //斜杠全部替换
                            var voicePath = data.content.replace(/\\/g, "/");
                            console.log("斜杠替换后路径: " + voicePath);
                            //映射服务器中语音路径
                            voicePath = "https://" + appInstance.globalData.domainUrl + "/D" + voicePath.substring(voicePath.indexOf(":/") + 1);
                            var object = createObject(3, '', voicePath, '0', chatTime);
                            that.data.messageList.push(object);
                        } else if (data.dataType == '8') {
                            // 微信小程序视频
                            //斜杠全部替换
                            var videoPath = data.content.replace(/\\/g, "/").replace(":", "");
                            // 映射服务器中的路径
                            videoPath = "https://" + appInstance.globalData.domainUrl + "/" + videoPath;
                            console.log("视频的路径: " + videoPath);
                            var object = createObject(8, '', videoPath, '0', chatTime);
                            that.data.messageList.push(object);
                        }
                    }
                }

                //将数据传递到页面
                that.setData({
                    messageList: that.data.messageList
                });
                console.log("聊天记录: " + JSON.stringify(that.data.messageList));

                that.setData({ scrollTopVal: 999999 });
            },
            complete: function (res) {
                if (res == null || res.data == null) {
                    console.error("网络请求失败!");
                }
            }
        });
    },
    // 预览视频
    previewVideo: function (e) {
        console.log(e);
        var videourl = e.target.dataset.video_src;
        console.log("预览video的路径为:" + videourl);
        // 跳转到另外一个页面
        wx.navigateTo({
            url: '../video/video?videourl=' + videourl
        })
    },
    clickEvent: function (e) {
        var that = this;
        console.log("点击了加号图片");
        var isClickPlus = that.data.isClickPlus;
        var scrollHeight = that.data.scrollHeight;
        if (isClickPlus == true) {
            isClickPlus = false;
            scrollHeight = "80%";
        } else {
            isClickPlus = true;
            scrollHeight = "70%";
        }
        /**isClickPlus: !this.data.isClickPlus */
        this.setData({
            isClickPlus: isClickPlus,
            scrollHeight: scrollHeight
        });
    },

    changeToService: function (e) {
        console.log("点击了切换到理赔专员界面");
        wx.redirectTo({
            url: '/pages/uploadimg/uploadimg'
        })
    },

    /**上传图片 */
    addImage: function (e) {
        var that = this;
        wx.chooseImage({
            success: function (res) {
                console.log(res);
                var tempFilePaths = res.tempFilePaths;
                console.log("图片路径: " + tempFilePaths[0]);

                //案件ID
                var caseId = appInstance.globalData.caseId;
                console.log("addImage中的caseId: " + caseId);
                //上传照片
                wx.uploadFile({
                    url: 'https://' + appInstance.globalData.domainUrl + '/servlet/SavePhotoByWeChat',
                    header: {
                        "Content-Type": "multipart/form-data"
                    },
                    //上传文件的时候filePath必须为字符串 
                    filePath: tempFilePaths[0],
                    name: 'file',
                    formData: {
                        'caseId': caseId
                    },
                    //最需要注意的是，success返回数据是String类型，
                    //我们需要将String类型转换成Object
                    success: function (res) {
                        console.log("服务器端返回的数据: " + res.data);
                        var json = JSON.parse(res.data);
                        //图片保存在本地的路径
                        var imagePath = json.fileName;
                        console.log("图片保存在本地的路径: " + imagePath);

                        console.log("发送websocket时图片路径信息: " + "data:;base64," + imagePath.replace(/\/\//g, '/') + ",");
                        /**websocket发送图片路径 */
                        wx.sendSocketMessage({
                            data: "data:;base64," + imagePath.replace(/\/\//g, '/') + ",0"
                        })
                        //斜杠全部替换
                        imagePath = imagePath.replace(/\\\\/g, "/");
                        console.log("斜杠替换后图片路径: " + imagePath);
                        //映射服务器中图片路径
                        imagePath = "https://" + appInstance.globalData.domainUrl + "/D" + imagePath.substring(imagePath.indexOf(":/") + 1);
                        console.log("服务器上的图片路径: " + imagePath);

                        var currentTime = util.formatTime2(new Date());
                        console.log("系统当前时间: " + currentTime);
                        //显示保存在本地的图片
                        //添加元素到数组中 
                        var object = createObject(2, '', imagePath, '0', currentTime);
                        that.data.messageList.push(object);
                        that.setData({
                            messageList: that.data.messageList
                        });

                        console.log("添加图片后messageList集合元素: " + that.data.messageList);
                        var scrollTopVal = that.data.scrollTopVal + 10;
                        that.setData({ scrollTopVal: scrollTopVal, isClickPlus: false });
                    }
                });
            }
        });
    },

    /**上传录音 */
    //手指按下
    touchdown: function () {
        var that = this;
        console.log("手指按下开始录音...");
        console.log("new date : " + util.formatTime2(new Date()));
        wx.startRecord({
            success: function (res) {
                console.log("录制成功...");
                //临时路径,下次进入小程序时无法正常使用
                var tempFilePath = res.tempFilePath;
                //设置值             
                that.setData({
                    voicePath: tempFilePath
                });
                console.log("保存在data中的voicePath的值为:" + that.data.voicePath); 
                /**
                 * 上传文件部分
                 */ 
                try {
                    // 执行上传操作，that表示当前的页面对象
                    audioHandler(that);
                } catch (e) {
                    console.log(e);
                } 
            },
            fail: function (res) {
                console.log("录制失败...");
                // 清空voicePath字段的值
                that.setData({
                    voicePath: ''
                });
                //录音失败
                wx.showModal({
                    title: '提示',
                    content: '录音的姿势不对!',
                    showCancel: false,
                    success: function (res) {
                        if (res.confirm) {
                            console.log('用户点击确定');
                            return;
                        }
                    }
                });
            }
        });
    },
    //手指抬起
    touchup: function () {
        console.log("手指移开.....");
        // 关闭录制
        wx.stopRecord();
    },
    /**播放语音 */
    playVoice: function (event) {
        console.log("语音信息: " + JSON.stringify(event.currentTarget));
        var voice_src = event.currentTarget.dataset.voice_src;
        console.log("语音的路径: " + voice_src);

        wx.downloadFile({
            url: voice_src, //仅为示例，并非真实的资源
            success: function (res) {
                console.log("----->语音播放的临时路径" + res.tempFilePath);
                wx.playVoice({
                    filePath: res.tempFilePath,
                    success: function () {
                        wx.showToast({
                            title: '播放结束',
                            icon: 'success',
                            duration: 1000
                        })
                    }
                })
            },
            fail: function () {// 如果失败（说明是本地文件）
                wx.playVoice({
                    filePath: voice_src,
                    success: function () {
                        wx.showToast({
                            title: '播放结束',
                            icon: 'success',
                            duration: 1000
                        })
                    }
                })
            }
        })

    },

    /**上传视频 */
    chooseVideo: function () {
        var that = this;
        wx.chooseVideo({
            success: function (res) {
                console.log(res);
                var tempFilePath = res.tempFilePath;
                console.log("tempFilePath: " + tempFilePath);
                //案件ID
                var caseId = appInstance.globalData.caseId;
                //上传视频
                wx.uploadFile({
                    url: 'https://' + appInstance.globalData.domainUrl + '/servlet/UploadVideoByWebChat',
                    header: {
                        "Content-Type": "multipart/form-data"
                    },
                    filePath: tempFilePath,
                    name: 'file',
                    formData: {
                        'caseId': caseId
                    },
                    success: function (res) {
                        console.log("服务器端返回的数据: " + res.data);
                        // 绑定视频数据                       
                        //斜杠全部替换
                        try {
                            var jsonobject = JSON.parse(res.data);
                            var videoPath = jsonobject.fileName.replace(/\\\\/g, "/").replace(":", "");
                            // 映射服务器中的路径
                            videoPath = "https://" + appInstance.globalData.domainUrl + "/" + videoPath;
                            console.log("视频的路径: " + videoPath);
                            var currentTime = util.formatTime2(new Date());
                            console.log("---->当前时间:" + currentTime);
                            var object = createObject(8, '', videoPath, '0', currentTime);
                            that.data.messageList.push(object);
                            // 绑定数据
                            that.setData({
                                messageList: that.data.messageList
                            });

                            // 设置scroll-view的位置
                            var scrollTopVal = that.data.scrollTopVal + 10;
                            that.setData({ scrollTopVal: scrollTopVal, isClickPlus: false });
                        } catch (e) {
                            console.log("错误" + e);
                        }
                        wx.showToast({
                            title: '视频上传成功',
                            icon: 'success',
                            duration: 1000
                        });
                    }
                })
            }
        })
    },

    /**添加历史记录 */
    addRecord: function (e) {
        var that = this;
        var lastVisitTime = this.data.lastVisitTime; //上次访问最后一条记录的时间
        //案件ID
        var caseId = appInstance.globalData.caseId;
        console.log("addRecord中的caseId: " + caseId);
        console.log("addRecord中的lastVisitTime: " + lastVisitTime);
        //获取所有的聊天记录
        wx.request({
            url: 'https://' + appInstance.globalData.domainUrl + '/receiveAll', //获取所有的聊天记录
            /**
            * 不管怎么设置header[即使设置application/x-www-form-urlencoded],
            * 这货都会在最后加上application/json. 
            */
            header: {
                'content-type': "application/x-www-form-urlencoded"
            },
            method: 'POST',
            data: {
                caseId: caseId,
                dataTime: lastVisitTime,
                startCount: '0',
                msgType: '0'
            },
            success: function (res) {
                var jsonString = JSON.stringify(res.data);
                console.log("获取当前时间的的20条聊天记录：　" + jsonString);
                var historyList = [];
                //返回的聊天记录
                var dataAttr = res.data.DATA;
                for (var i = 0; i < dataAttr.length; i++) {
                    var data = dataAttr[i];
                    //聊天时间
                    var chatTime = data.lasterTime;
                    if (data.msgType == '1') {
                        //客服
                        //文字
                        if (data.dataType == '28') {
                            var object = createObject(1, data.content, '', 1, chatTime);
                            historyList.push(object);
                        } else if (data.dataType == '0') {
                            //图片
                            //斜杠全部替换
                            var imagePath = data.content.replace(/\\/g, "/");
                            console.log("斜杠替换后路径: " + imagePath);
                            //映射服务器中图片路径
                            imagePath = "https://" + appInstance.globalData.domainUrl + "/D" + imagePath.substring(imagePath.indexOf(":/") + 1);
                            var object = createObject(2, '', imagePath, '1', chatTime);
                            historyList.push(object);
                        }
                    } else {
                        //客户
                        //文字
                        if (data.dataType == '28') {
                            var object = createObject(1, data.content, '', '0', chatTime);
                            historyList.push(object);
                        } else if (data.dataType == '0') {
                            //图片
                            //斜杠全部替换
                            var imagePath = data.content.replace(/\\/g, "/");
                            console.log("斜杠替换后路径: " + imagePath);
                            imagePath = imagePath.substring(0, imagePath.lastIndexOf(".")) + "_Normal" + imagePath.substring(imagePath.lastIndexOf("."));
                            console.log("加上Normal后的图片路径: " + imagePath);
                            //映射服务器中图片路径
                            imagePath = "https://" + appInstance.globalData.domainUrl + "/D" + imagePath.substring(imagePath.indexOf(":/") + 1);
                            var object = createObject(2, '', imagePath, '0', chatTime);
                            historyList.push(object);
                        } else if (data.dataType == '6') {
                            //微信小程序语音
                            //斜杠全部替换
                            var voicePath = data.content.replace(/\\/g, "/");
                            console.log("斜杠替换后路径: " + voicePath);
                            //映射服务器中语音路径
                            voicePath = "https://" + appInstance.globalData.domainUrl + "/D" + voicePath.substring(voicePath.indexOf(":/") + 1);
                            var object = createObject(3, '', voicePath, '0', chatTime);
                            historyList.push(object);
                        } else if (data.dataType == '8') {
                            // 微信小程序视频
                            //斜杠全部替换
                            var videoPath = data.content.replace(/\\/g, "/").replace(":", "");
                            // 映射服务器中的路径
                            videoPath = "https://" + appInstance.globalData.domainUrl + "/" + videoPath;
                            console.log("视频的路径: " + videoPath);
                            var object = createObject(8, '', videoPath, '0', chatTime);
                            historyList.push(object);
                        }
                    }
                }

                //unshift 方法用于向数组的开头添加一个或多个元素，并返回新数组的长度
                for (var j = 0; j < historyList.length; j++) {
                    that.data.messageList.unshift(historyList[j]);
                }

                //将数据传递到页面
                that.setData({
                    messageList: that.data.messageList,
                    isClickPlus: false
                });
                console.log("聊天记录: " + JSON.stringify(that.data.messageList));

                that.setData({ scrollTopVal: 999999 });
            },
            complete: function (res) {
                if (res == null || res.data == null) {
                    console.error("网络请求失败!");
                }
            }
        });
    },

    getTextValue: function (e) {
        //获取文本域中输入的值值
        var textValue = e.detail.value;
        console.log("文本域中的值: " + textValue);
        this.setData({
            textValue: textValue
        })
    },

    sendText: function (e) {
        var that = this;
        //获取文本域中输入的值值
        var textValue = that.data.textValue;
        console.log("文本域中的值: " + textValue);
        if (textValue == '') {
            this.setData({
                isShadow: true
            })
        } else {
            //清空文本域中值
            this.setData({
                textValue: ''
            })

            /**websocket发送文字 */
            wx.sendSocketMessage({
                data: textValue
            })

            var currentTime = util.formatTime2(new Date());
            console.log("系统当前时间: " + currentTime);

            //添加元素到数组中 
            var object = createObject(1, textValue, '', '0', currentTime);
            that.data.messageList.push(object);
            that.setData({
                messageList: that.data.messageList,
                lastVisitTime: currentTime
            });

            console.log("添加文字后messageList集合元素: " + that.data.messageList);

            var scrollTopVal = that.data.scrollTopVal + 10;
            that.setData({ scrollTopVal: scrollTopVal });
        }
    },

    cancelShadow: function () {
        this.setData({
            isShadow: false
        })
    },
    /**点击图片可以预览 */
    previewImage: function (event) {
        console.log("图片信息: " + JSON.stringify(event.currentTarget));
        var image_src = event.currentTarget.dataset.image_src;
        console.log("预览图片的路径: " + image_src);
        wx.previewImage({
            current: image_src, // 当前显示图片的http链接
            urls: [image_src] // 需要预览的图片http链接列表
        })
    },

    /**监听滚动 */
    scroll: function (event) {
        //   该方法绑定了页面滚动时的事件，我这里记录了当前的position.y的值,为了请求数据之后把页面定位到这里来。
        console.log("滚动信息: " + JSON.stringify(event.detail));
        this.setData({
            scrollTop: event.detail.scrollTop
        });
    }
})

/**
 * messageType 消息类型[1表示文字,2表示图片,3表示语音]
 * messageValue 文本值
 * imageUrl 图片路径
 * sendType 0表示客户,1表示客服
 * chatTime 聊天时间
 */
function createObject(messageType, messageValue, imageUrl, senderType, chatTime) {
    var obj = new Object();
    obj.messageType = messageType;
    obj.messageValue = messageValue;
    obj.imageUrl = imageUrl;
    obj.senderType = senderType;
    obj.chatTime = chatTime;
    return obj;
}


/**
 * 语音文件的处理
 * current:当前页面的对象
 */
function audioHandler(current) {
    var that = current;
    //录音文件的临时路径径
    var tempVoicePath = that.data.voicePath;
    //案件ID
    var caseId = appInstance.globalData.caseId;
    console.log("录音文件保存的临时位置为:" + tempVoicePath);
    if (tempVoicePath != '') {// 如果临时路径的文件不为空 
        wx.uploadFile({
            url: 'https://' + appInstance.globalData.domainUrl + '/servlet/SaveVoiceByWebChat',
            header: {
                "Content-Type": "multipart/form-data"
            },
            filePath: tempVoicePath,
            name: 'file',
            formData: {
                'caseId': caseId
            },
            success: function (res) {
                console.log("服务器端返回的数据: " + res.data);
                var json = JSON.parse(res.data);
                //录音文件保存在本地的路径
                var voicePath = json.fileName;
                console.log("录音文件保存在本地的路径: " + voicePath);

                wx.sendSocketMessage({
                    data: "data:audio/silk;base64," + voicePath.replace(/\/\//g, '/') + ",0"
                });

                var currentTime = util.formatTime2(new Date());
                // 显示当前时间
                console.log("##系统当前时间: " + currentTime);
                //显示保存在本地的录音
                console.log("##录音文件的临时路径: " + tempVoicePath);
                //添加元素到数组中 
                var object = createObject(3, '', tempVoicePath, '0', currentTime);

                // 放置到全局的data中重新渲染页面
                that.data.messageList.push(object);
                that.setData({
                    messageList: that.data.messageList
                });

                console.log(that.data.messageList);

                // 设置scroll-view的位置
                var scrollTopVal = that.data.scrollTopVal + 10;
                that.setData({ scrollTopVal: scrollTopVal, isClickPlus: false });
            },
            // 如果失败
            fail: function () {
                that.setData({ isClickPlus: false });
                wx.showToast({
                    title: "语音上传失败",
                    icon: 'success',
                    duration: 2000
                });
            },
            complete: function () {
                // 清空voicePath字段的值
                that.setData({
                    voicePath: ''
                });
                console.log("###上传语音结束###");
            }
        });
    } else {
        wx.showToast({
            title: "请重新录音!",
            icon: 'success',
            duration: 2000
        });
    }
}


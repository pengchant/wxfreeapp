//index.js
var socketOpen = false
var socketMsgQueue = []
var common = require('../../utils/handkoo.js');

var appInstance = getApp();

/**
 * page页面注册
 */
Page({
    data: {
        caseId: appInstance.globalData.caseId,// caseId 
        username: appInstance.globalData.username,// username     
        sunshiImage: [],//损失的图片列表
        mubanImgList: []// 模板的图片数组              
    },
    changeToService: function (e) {
        console.log("点击了切换到理赔专员界面");
        wx.redirectTo({
            url: '/pages/index/index'
        })
    },
    // 监听页面加载完成
    onReady: function () {
        // 加载损失图片
        loadLossingImg(this);
        // 加载模板照片
        loadMubanImg(this); 
    },
    // 拍摄损失照片（【需要与websocet交互】）
    createImg: function () {
        createLossingImg(this);
    },
    //拍摄模板照片（【需要与websocet交互】）
    uploadmoduleimg: function (e) {
        var imgtype = e.currentTarget.dataset.imgid;
        createMubanImg(this, imgtype);
    },
    onHide: function () {
    },
    onShow: function () {// 页面显示监听来自
        var that = this;
        wx.onSocketMessage(function (res) {
            console.log("监听网页返回的数据.......");
            console.log(res);
            let flag = '';// 标记(消息的类别)
            let message = '';// 证件大类的编号
            let json;// 定义json对象
            try {
                json = JSON.parse(res.data);
                flag = json.Flag;// 消息的标记
                message = json.message;// 证件大类的编号
                console.log("获取到报文的种类:" + flag + ",获取到的报文消息内容:" + message);
            } catch (e) {
            }
            if (flag == '3' || flag == '4') {
                // 1.监听审核通过
                // {Flag: "3", message: "5"}
                // 2.监听审核不通过
                // {Flag: "4", message: "2", caseId: "983522", dataId: "14"}
                loadImgStatus(flag, message, that);
            } else if (flag == '6') {
                // 3.监听在其他地方登陆的处理
                // {"Flag":"6"}
                appInstance.socketClosedCurr(appInstance, res);
            }

        });
    },
    preview: function (e) {// 预览当前图片
        let imgurl = e.currentTarget.dataset.imgurl;
        console.log("即将预览图片的路径" + imgurl);
        wx.previewImage({
            current: '', // 当前显示图片的http链接
            urls: [imgurl] // 需要预览的图片http链接列表
        })
    },
    previewAll: function (e) {// 预览所有图片
        console.log("开始预览所有的图片...");
        console.log(e);
        let current = e.currentTarget.dataset.current;
        let allImgUrls = e.currentTarget.dataset.imgurls;
        console.log(current, allImgUrls);
        console.log("当前的路径--->");
        console.log(current);
        wx.previewImage({
            current: current, // 当前显示图片的http链接
            urls: allImgUrls // 需要预览的图片http链接列表
        })
    }
})

/**
 * 获取webscoket传递过来的消息，动态改变图片的审核状态
 * flag:状态标记:3:通过，4：不通过
 * message:证件的编号
 * current:当前页面的对象
 */
function loadImgStatus(flag, message, current) {
    console.log("即将改变模板的编号:" + message);

    // 遍历找到模板
    for (let i = 0; i < current.data.mubanImgList.length; i++) {
        if (current.data.mubanImgList[i].mubanid == message) {
            // 改变值(约定:0待审核，1：通过，2：不通过)
            if (flag == '3') {// 通过
                current.data.mubanImgList[i].hasPassed = 1;
            } else if (flag == '4') {// 不通过
                current.data.mubanImgList[i].hasPassed = 2;
            }
            // 改变data的值值
            current.setData({
                mubanImgList: current.data.mubanImgList
            });
            console.log("该页面上模板" + message + "图片状态改变了...");
            // 终止循环
            continue;
        }
    }

    console.log("改变状态完成...");
}

/**
 * 定义损失部位的数据结构
 */
function createLossing(id, url) {
    var object = new Object();
    object.id = id;
    object.url = url;
    return object;
}

/**
 * 定义模板的数据结构
 * caseid:案件号
 * hasPassed:是否已经通过
 * imageDataid:图片表的编号
 * imageUrl:图片的路径
 * isTooked:是否已经拍摄
 * mubanTableId:模板数据库表的编号
 * mubanTitle:模板的名称
 * mubanid:模板的编号
 */
function createModule(caseId, hasPassed, imageDataid, imageUrl,
    isTooked, mubanTableId, mubanTitle, mubanid) {
    var object = new Object();
    object.caseId = caseId;
    object.hasPassed = hasPassed;
    object.imageDataid = imageDataid;
    object.imageUrl = imageUrl;
    object.isTooked = isTooked;
    object.mubanTableId = mubanTableId;
    object.mubanTitle = mubanTitle;
    object.mubanid = mubanid;
    return object;
}

/**
 * 连接socket
 */
function connectToSocket(username, caseId) {
    wx.connectSocket({
        url: 'wss://' + appInstance.globalData.domainUrl + '/chat?username=' + username + '&caseId=' + caseId + '&isweixin=0'
    });
}

/**
 * 发送与websocket的心跳
 */
function sendHeartBeat() {
    console.log("发送websocket心跳...@websocket#check*online");
    wx.sendSocketMessage({
        data: "@websocket#check*online"
    });
}



/**
 * 发送消息
 */
function sendSocketMessage(msg) {
    console.info("获取到用户的消息:" + msg);
    if (socketOpen) {
        wx.sendSocketMessage({
            data: msg
        })
    } else {
        socketMsgQueue.push(msg)
    }
}

/**
 * 拍摄模板照片
 */
function createMubanImg(current, imgType) {
    var that = current;
    var imgtype = imgType;
    // 选择图片
    wx.chooseImage({
        count: 1,
        sizeType: ['original', 'compressed'],
        sourceType: ['album', 'camera'],
        success: function (res) {
            // 如果成功
            var tempFilePaths = res.tempFilePaths;
            // 开始上传
            wx.uploadFile({
                url: 'https://' + appInstance.globalData.domainUrl + '/servlet/SavePhotoByWeChat',
                filePath: tempFilePaths[0],
                name: 'file',
                header: {
                    'content-type': 'multipart/form-data'
                },
                formData: {
                    'caseId': appInstance.globalData.caseId
                },
                success: function (res) {
                    var data = res.data;
                    console.log("服务器端返回的数据:" + data);
                    var imgobject = JSON.parse(data);
                    // 上传图片后返回发送websocket
                    // 上传到后台（websocket发送）【这里是真正区分不同图片的类别的地方，imgtype！通过发送websockt请求，将之前存在本地里面的图片保存到ftp上上...】
                    var socketmessage = "data:;base64," + imgobject.fileName.replace(/\/\//g, '/') + "," + imgtype;
                    console.log("websocket 发送给后台的数据:" + socketmessage);
                    wx.sendSocketMessage({
                        data: socketmessage,
                        success: function (res) {
                            console.log("==============>保存成功!");
                            // 把图片显示在页面上                                
                            for (let i = 0; i < that.data.mubanImgList.length; i++) {
                                if (that.data.mubanImgList[i].mubanid == imgtype) {// 如果找到匹配的编号
                                    // 设置图片的路径
                                    that.data.mubanImgList[i].imageUrl = 'https://' + appInstance.globalData.domainUrl + '/' + imgobject.fileName.replace(/\\\\/g, '/').replace(':', "");
                                    // 设置图片已经拍摄完成
                                    that.data.mubanImgList[i].isTooked = 1;
                                    // 设置图片待审核
                                    that.data.mubanImgList[i].hasPassed = 0;
                                }
                                continue;
                            }
                            console.log(that.data.mubanImgList);
                            // 重新设置data
                            that.setData({
                                mubanImgList: that.data.mubanImgList
                            });
                            wx.showToast({
                                title: '操作成功',
                                icon: 'success',
                                duration: 2000
                            }); 
                        },
                        fail: function () {
                            console.log("发送图片保指令失败...");
                        },
                        complete: function () {
                            console.log("发送图片指令保存完成...");
                        }
                    })
                },
                fail: function () {
                    console.log("上传图片调用web接口失败...");
                },
                complete: function () {
                    console.log("上传图片调用web接口调用完成...");
                }
            })

        },
        fail: function () {
            console.log("选择图片失败...");
        },
        complete: function () {
            console.log("选择图片完成...");
        }
    })
}

/**
 * 拍摄损失照片
 */
function createLossingImg(current) {
    var that = current;
    wx.chooseImage({
        count: 1,
        sizeType: ['original', 'compressed'],
        sourceType: ['album', 'camera'],
        success: function (res) {
            // 图片的路径
            var tempFilePaths = res.tempFilePaths;
            console.log(tempFilePaths);
            // 获取图片的信息   
            var photolen = '';// 图片的长度
            var phototime = ''; // 图片创建的时间

            console.log("获取文件的信息...");
            wx.getSavedFileInfo({
                filePath: tempFilePaths[0], //仅做示例用，非真正的文件路径
                success: function (res) {
                    photolen = res.size;
                    phototime = common.getLocalTime(res.createTime);
                    console.log("获取到的图片信息为为：" + res.size + "," + common.getLocalTime(res.createTime));
                    console.log("开始上传到后台...临时文件的地址为为:" + tempFilePaths[0]);
                    // 上传到后台
                    wx.uploadFile({
                        url: 'https://' + appInstance.globalData.domainUrl + '/servlet/SavePhotoByWeChat',
                        filePath: tempFilePaths[0],
                        name: 'file',
                        header: {
                            'content-type': 'multipart/form-data'
                        },
                        formData: {
                            'photoLen': photolen,
                            'caseId': appInstance.globalData.caseId,
                            'photoTime': phototime,
                            'lastTime': common.getcurrentTime()
                        },
                        success: function (res) {
                            var data = res.data;
                            console.log("服务器端返回的数据:" + data);
                            var imgobject = JSON.parse(data);
                            // wx.onSocketMessage(function (res) {
                            //     console.log('收到服务器内容：' + res.data)
                            // })
                            // 前台显示        
                            that.data.sunshiImage.push("https://" + appInstance.globalData.domainUrl + "/" + imgobject.fileName.replace(/\\\\/g, '/').replace(':', ""));


                            that.setData({
                                sunshiImage: that.data.sunshiImage
                            });
                            // 上传到后台（websocket发送）
                            var socketmessage = "data:;base64," + imgobject.fileName.replace(/\/\//g, '/') + ",Add" + new Date().getTime();
                            console.log("websocket 发送给后台的数据:" + socketmessage);
                            wx.sendSocketMessage({
                                data: socketmessage,
                                success: function (res) {
                                    console.log("=====================>保存成功!");
                                    console.log(res);
                                    wx.showToast({
                                        title: '操作成功',
                                        icon: 'success',
                                        duration: 2000
                                    }); 
                                },
                                fail: function () {
                                    console.log("发送图片保指令失败...");
                                },
                                complete: function () {
                                    console.log("发送图片指令保存完成...");
                                }
                            })
                        },
                        fail: function (res) {
                            console.log("调用失败..." + res.data);
                        },
                        complete: function () {
                            console.log("调用完成...");
                        }
                    })

                }
            })
        }
    })
}


/**
 * 加载所有的损失部位的图片
 */
function loadLossingImg(current) {
    var that = current;
    // 损失部位的照片(损失部位的照片)
    wx.request({
        url: 'https://' + appInstance.globalData.domainUrl + '/UploadImgServlet',
        data: {
            type: '2',
            caseId: appInstance.globalData.caseId
        },
        header: {
            'content-type': 'application/x-www-form-urlencoded'
        },
        success: function (res) {
            console.log("加载所有损失部位照片成功==>数据...");
            console.log(res);
            if (res.data != null) {
                // 开始解析数据
                for (var i = 0; i < res.data.length; i++) {
                    try {
                        let newObj = createLossing(res.data[i].imageDataid, res.data[i].imgUrl);
                        newObj.url = 'https://' + appInstance.globalData.domainUrl + "/" + newObj.url.replace(/\\/g, '/').replace(":", "");
                        console.log("访问图片的地址-->" + newObj.url);
                        that.data.sunshiImage.push(newObj.url);
                    } catch (e) {
                        console.log(e);
                    }
                }
                // 设置值
                that.setData({
                    sunshiImage: that.data.sunshiImage
                });
            } else {
                console.log("加载损失部位的照片为空...");
            }

        }
    })
}

/**
 * 加载所有模板图片
 */
function loadMubanImg(current) {
    var that = current;
    // 请求获取数据(模板的照片)
    wx.request({
        url: 'https://' + appInstance.globalData.domainUrl + '/UploadImgServlet',
        data: {
            type: '0',
            caseId: appInstance.globalData.caseId
        },
        header: {
            'content-type': 'application/x-www-form-urlencoded'
        },
        success: function (res) {
            console.log("加载所有模板照片成功==>数据...");
            console.log(res);
            let myarray = res.data;
            if (myarray != null) {
                console.log(myarray.length);
                // 解析数据
                for (var i = 0; i < myarray.length; i++) {
                    try {
                        let newobj = createModule(myarray[i].caseid, myarray[i].hasPassed, myarray[i].imageDataid, myarray[i].imageUrl, myarray[i].isTooked, myarray[i].mubanTableId, myarray[i].mubanTitle, myarray[i].mubanid);
                        // 对数据进行处理
                        //判断是否已经拍摄，如果已经拍摄
                        console.log("是否已经拍摄:" + newobj.isTooked);
                        if (newobj.isTooked == '1') {
                            newobj.imageUrl = 'https://' + appInstance.globalData.domainUrl + '/' + newobj.imageUrl.replace(/\\/g, '/').replace(":", "");
                            console.log("访问图片url:" + newobj.imageUrl);
                            // 判断是否已经评价过
                        } else {
                            newobj.imageUrl = "../../resources/img/" + newobj.imageUrl;
                            console.log("访问图片url:" + newobj.imageUrl);
                        }
                        that.data.mubanImgList.push(newobj);
                    } catch (e) {
                        console.log(e);
                    }
                }
                // 设置值值
                that.setData({
                    mubanImgList: that.data.mubanImgList
                });
            } else {
                console.log("查询出来的所有的模板的照片为空...");
            }

        }
    })
}
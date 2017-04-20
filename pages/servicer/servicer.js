//定义全局变量
var imageList = [];
Page({
    data: {
    },
    changeToService: function(e){
        console.log("点击了切换到理赔专员界面");
         wx.navigateTo({
            url: '/pages/index/index'
        })
    },
    addImage: function(e){
        var that = this
        wx.chooseImage({
            success: function (res) {
                console.log(res);
                var tempFilePaths = res.tempFilePaths;
                console.log("图片路径: " + tempFilePaths[0]);
                //添加元素到数组中 
                imageList.push(tempFilePaths[0]);
                that.setData({
                    imageList: imageList
                });
            }
        })
    }
})
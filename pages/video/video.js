Page({
    data: {
        url:''// 录像的路径
    },
    onShow: function () {// 页面显示时的时间

    },
    onReady: function () {// 页面加载完毕后

    },
    onLoad:function(option){
        console.log("获取到的录像的路径为为-->"+option.videourl);
        this.setData({
            url:option.videourl
        });
    }
});
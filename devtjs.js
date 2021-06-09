
var dev_data_ = [{a: 0, v: -2}, {a: 45, v: 6}, {a: 90, v:16}, {a:135, v:17}, {a: 180, v: 7}, {a: 225, v: -5}, {a: 270, v: -17}, {a: 315, v: -14}];


function deg2rad(x)
{
   return x * Math.PI / 180;
}


function rad2deg(x)
{
   return x * 180 / Math.PI;
}


class Deviation
{
   constructor(dev_data)
   {
      if (dev_data.length < 1)
         throw "no elements in array";

      this.dev_data = dev_data;
      this.dev_data.sort(function(a, b){return a.a - a.b;});
      this.dev_data.push({a: this.dev_data[0].a + 360, v: this.dev_data[0].v});

      this.init();
      console.log(this);
   }


   init()
   {
      this.a = this.calc_coeff([{a: 0, v: 1}, {a: 90, v: 1}, {a: 180, v: 1}, {a: 270, v: 1}]);
      this.b = this.calc_coeff([{a: 90, v: 1}, {a: 270, v: -1}]);
      this.c = this.calc_coeff([{a: 0, v: 1}, {a: 180, v: -1}]);
      this.d = this.calc_coeff([{a: 45, v: 1}, {a: 135, v: -1}, {a: 225, v: 1}, {a: 315, v: -1}]);
      this.e = this.calc_coeff([{a: 0, v: 1}, {a: 90, v: -1}, {a: 180, v: 1}, {a: 270, v: -1}]);
      console.log("a = " + this.a + ", b = " + this.b + ", c = " + this.c + ", d = " + this.d + ", e = " + this.e);
   }


   lin_val(a)
   {
      var i;

      a %= 360.0;

      for (i = 0; i < this.dev_data.length - 1; i++)
         if (a >= this.dev_data[i].a && a < this.dev_data[i + 1].a)
            break;

      var k = (this.dev_data[i + 1].v - this.dev_data[i].v) / (this.dev_data[i + 1].a - this.dev_data[i].a);
      return (a - this.dev_data[i].a) * k + this.dev_data[i].v;
   }


   calc_coeff(coeff)
   {
      var v = 0;
      for (var i = 0; i < coeff.length; i++)
         v += coeff[i].v * this.lin_val(coeff[i].a);
      return v / coeff.length;
   }


   dev_val(a)
   {
      var z = deg2rad(a);
      return this.a + this.b * Math.sin(z) + this.c * Math.cos(z) + this.d * Math.sin(2 * z) + this.e * Math.cos(2 * z);
   }
}


class DevDiag
{
   constructor(canvas)
   {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.dev = null;

      this.init_ctx();
   }


   set_dev_data(data)
   {
      this.dev = new Deviation(data);
   }


   clear()
   {
       this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
   }


   init_ctx()
   {
      this.ctx.translate(this.canvas.width * 0.1, this.canvas.height / 2);
      //this.ctx.scale(this.canvas.width * 0.8 / 360, this.canvas.height * 0.8 / 35 );
      this.sx = this.canvas.width * 0.8 / 360;
      this.sy = this.canvas.height * 0.8 / 35;
   }


   axis()
   {
      this.ctx.save();

      for (var i = -20; i <= 20; i++)
      {
         this.ctx.beginPath();
         if ((i % 5) == 0)
         {
            this.ctx.strokeStyle = '#a0a0a0';
            this.ctx.setLineDash([]);
         }
         else
         {
            this.ctx.strokeStyle = '#e0e0e0';
            this.ctx.setLineDash([4, 2]);
         }
         this.ctx.moveTo(0, i * this.sy);
         this.ctx.lineTo(360 * this.sx, i * this.sy);
         this.ctx.stroke();
      }

      for (var i = 0; i <= 360; i += 22.5)
      {
         this.ctx.beginPath();
         this.ctx.strokeStyle = '#e0e0e0';
         this.ctx.setLineDash([4, 2]);
         this.ctx.moveTo(i * this.sx, -20 * this.sy);
         this.ctx.lineTo(i * this.sx, 20 * this.sy);
         this.ctx.stroke();
      }

      this.ctx.setLineDash([]);
      this.ctx.strokeStyle = '#505050';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(0, -20 * this.sy);
      this.ctx.lineTo(0, 20 * this.sy);
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(360 * this.sx, 0);
      this.ctx.stroke();

      this.ctx.restore();
   }

   draw()
   {
      this.clear();
      this.axis();

      this.ctx.strokeStyle = '#404040';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      for (var i = 0; i <= 360; i += 45)
         this.ctx.lineTo(i * this.sx, this.dev.lin_val(i) * this.sy);
      this.ctx.stroke();

      this.ctx.strokeStyle = '#f04040';
      this.ctx.beginPath();
      for (var i = 0; i <= 360; i += 10)
         this.ctx.lineTo(i * this.sx, this.dev.dev_val(i) * this.sy);
      this.ctx.stroke();
   }
}


var diag_ = document.getElementById('diag');
diag_.width = window.innerWidth;
diag_.height = window.innerHeight;

var dd_ = new DevDiag(diag_);
dd_.set_dev_data(dev_data_);
dd_.draw();


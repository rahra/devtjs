
//! global diagram settings
var G =
{
   //! maximum iteration of optimizer
   maxit: 10,
   //! maximum deviation in diagram
   maxdev: 20,
   //! heading steps in diagram
   hdgstep: 22.5,
   //! font scaling
   fontscale: 2.5,
   //! size of measured points
   dotsize: 3
};


/*! Get data from input field.
 * The data shall be in the following format:
 * hdg0:dev0, hdg1:dev1, hdg2:dev2,...
 */
var intxt_ = document.getElementById("devinput");


function deg2rad(x)
{
   return x * Math.PI / 180;
}


function rad2deg(x)
{
   return x * 180 / Math.PI;
}


function dev2text(d)
{
   return (d > 0 ? "+" : "") + d;
}


function hdg2text(a)
{
   var n = "", m;

   if (a < 0)
   {
      n = "-";
      a = -a;
   }

   if (a >= 100)
      m = 0;
   else if (a >= 10)
      m = 1;
   else m = 2;

   return n + "0".repeat(m) + a;
}


/*! This class calculates the deviation curve dependent on the input data.
 */
class Deviation
{
   constructor(dev_data, name = "C")
   {
      if (dev_data.length < 1)
         throw "no elements in array";

      this.name = name;
      this.dev_data = this.dev_clone(dev_data);
      this.dev_data.sort(function(a, b){return a.a - a.b;});
      this.dev_data.push({a: this.dev_data[0].a + 360, v: this.dev_data[0].v});
      if (this.dev_data[0].a > 0)
         this.dev_data.unshift({a: this.dev_data[this.dev_data.length - 2].a - 360, v: this.dev_data[this.dev_data.length - 2].v});

      this.C = [];
      this.init();
   }


   dev_clone(d0)
   {
      var d1 = [];
      for (var i = 0; i < d0.length; i++)
         d1.push({a: d0[i].a, v: d0[i].v});
      return d1;
   }


   /*! Calculate all coefficients and optimize curve.
    * (protected)
    */
   init()
   {
      this.C[0] = this.calc_coeff([{a: 0, v: 1}, {a: 90, v: 1}, {a: 180, v: 1}, {a: 270, v: 1}]);
      this.C[1] = this.calc_coeff([{a: 90, v: 1}, {a: 270, v: -1}]);
      this.C[2] = this.calc_coeff([{a: 0, v: 1}, {a: 180, v: -1}]);
      this.C[3] = this.calc_coeff([{a: 45, v: 1}, {a: 135, v: -1}, {a: 225, v: 1}, {a: 315, v: -1}]);
      this.C[4] = this.calc_coeff([{a: 0, v: 1}, {a: 90, v: -1}, {a: 180, v: 1}, {a: 270, v: -1}]);
      this.optimize();
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


   /*! Calculate base coefficient.
    * (protected)
    */
   calc_coeff(coeff)
   {
      var v = 0;
      for (var i = 0; i < coeff.length; i++)
         v += coeff[i].v * this.lin_val(coeff[i].a);
      return v / coeff.length;
   }


   /*! Return calculated deviation for specific angle a.
    * @param a Angle in degrees.
    * @return Returns deviation value.
    */
   dev_val(a)
   {
      var z = deg2rad(a);
      return this.C[0] + this.C[1] * Math.sin(z) + this.C[2] * Math.cos(z) + this.C[3] * Math.sin(2 * z) + this.C[4] * Math.cos(2 * z);
   }


   /*! Return standard deviation of original values and calculated values.
    */
   get var()
   {
      var v = 0;
      for (var i = 0; i < this.dev_data.length - 1; i++)
         v += Math.pow(this.dev_data[i].v - this.dev_val(this.dev_data[i].a), 2);
      return v;
   }


   /*! Return string representation of deviation formula.
    */
   get str()
   {
      return this.name + ": y = " + this.C[0].toFixed(2) + " + " + this.C[1].toFixed(2) + " · sin(z) + " + this.C[2].toFixed(2) + " · cos(z) + " + this.C[3].toFixed(2) + " · sin(2z) + " + this.C[4].toFixed(2) + " · cos(2z), var = " + this.var.toFixed(2);
   }


   /*! Approximate parameter to lower variance.
    * (protected)
    */
   find_limit(i, d)
   {
      var v0, v1;

      for (v0 = this.var;;)
      {
         this.C[i] += d;
         v1 = this.var;
         if (v1 > v0)
         {
            this.C[i] -= d;
            break;
         }
         v0 = v1;
      }
   }


   /*! This iteratively optimizes the initial values by modifiying the
    * coefficients to decrease the overal function deviation.
    */
   optimize()
   {
      var d = 0.01;
      var v0 = this.var, v1;

      for (var j = 0; j < G.maxit; j++)
      {
         for (var i = 0; i < 5; i++)
         {
            this.find_limit(i, d);
            this.find_limit(i, -d);
         }
         v1 = this.var;
         if (Math.abs(v0 - v1) < 0.001)
            break;
         v0 = v1;
      }
   }
}


/*! This class draws the diagram.
 */
class DevDiag
{
   constructor(canvas)
   {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.dev = [];

      this.init_ctx();
   }


   push(dev)
   {
      this.dev.push(dev);
   }


   reset()
   {
      for (var i = 0; i < this.dev.length; i++)
         delete this.dev[i];
      this.dev = [];
   }


   clear()
   {
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
   }


   init_ctx()
   {
      this.canvas.width = window.innerWidth * .95;
      this.canvas.height = window.innerHeight *.95;

      this.ctx.translate(this.canvas.width * 0.1, this.canvas.height / 2);
      //this.ctx.scale(this.canvas.width * 0.8 / 360, this.canvas.height * 0.8 / 35 );
      this.sx = this.canvas.width * 0.8 / 360;
      this.sy = -this.canvas.height * 0.8 / 35;
      //console.log("sx = " + this.sx + ", sy = " + this.sy);
   }


   axis()
   {
      var i, t;

      this.ctx.save();

      for (i = -G.maxdev; i <= G.maxdev; i++)
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

         t = dev2text(i);
         this.ctx.fillText(t, -5 - this.ctx.measureText(t).width, i * this.sy + this.ctx.measureText(t).actualBoundingBoxAscent / 2);
      }

      for (i = 0; i <= 360; i += G.hdgstep)
      {
         this.ctx.beginPath();
         this.ctx.strokeStyle = '#e0e0e0';
         this.ctx.setLineDash([4, 2]);
         this.ctx.moveTo(i * this.sx, -20 * this.sy);
         this.ctx.lineTo(i * this.sx, 20 * this.sy);
         this.ctx.stroke();

         t = hdg2text(i);
         this.ctx.save();
         this.ctx.translate(i * this.sx, 0);
         this.ctx.rotate(-Math.PI / 4);
         this.ctx.fillText(t, 0, 0);
         this.ctx.restore();
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


   draw_measurement(n)
   {
      for (var i = 0; i < this.dev[n].dev_data.length; i++)
      {
         this.ctx.beginPath();
         this.ctx.arc(this.dev[n].dev_data[i].a * this.sx, this.dev[n].dev_data[i].v * this.sy, G.dotsize, 0, 2 * Math.PI);
         this.ctx.stroke();
      }
   }


   draw_curve(n)
   {
      this.ctx.beginPath();
      for (var i = 0; i <= 360; i += 10)
         this.ctx.lineTo(i * this.sx, this.dev[n].dev_val(i) * this.sy);
      this.ctx.stroke();
   }


   draw()
   {
      const col = ["#f04040", "#4040f0"];
      this.ctx.font = this.sx * G.fontscale + "pt sans-serif";
      this.axis();

      for (var n = 0; n < this.dev.length; n++)
      {
         this.ctx.strokeStyle = this.ctx.fillStyle = col[n & 1];
         this.draw_measurement(n);

         this.draw_curve(n);

         var s = this.dev[n].str;
         this.ctx.fillText("[" + n + "] " + s, 10, (19 - n) * this.sy);
      }
   }


   /*! You may adjust the compass curve with the keyboard but this is mainly
    * for debugging.
    */
   key_down_handler(e)
   {
      var diff = 0.1;
      var k = -1;

      if (["a", "b", "c", "d", "e"].includes(e.key))
      {
         k = e.key.charCodeAt(0) - 0x61;
         diff *= -1;
      }
      else if (["A", "B", "C", "D", "E"].includes(e.key))
      {
         k = e.key.charCodeAt(0) - 0x41;
      }

      if (k != -1)
      {
         this.dev[0].C[k] += diff;
      }
      else
      {
         // do something else with other keys...
         return;
      }

      this.clear();
      this.draw();
   }
}


function update()
{
   var dev_data = [];

   var dv = intxt_.value.split(",");

   for (var i = 0; i < dv.length; i++)
   {
      var de = dv[i].split(":");
      if (de.length != 2)
         throw "syntax error in dev data";
      dev_data.push({a: +de[0], v: +de[1]});
   }

   dd_.reset();

   dd_.push(new Deviation(dev_data));

   for (var i = 0; i < dev_data.length; i++)
      dev_data[i].a += dev_data[i].v;

   dd_.push(new Deviation(dev_data, "M"));
}


var diag_ = document.getElementById('diag');
var dd_ = new DevDiag(diag_);
update();
dd_.draw();


document.addEventListener('keydown', function(e){dd_.key_down_handler(e);});
window.addEventListener('resize', function(){dd_.init_ctx(); dd_.clear(); dd_.draw();});
intxt_.addEventListener('change', function(){update(); dd_.clear(); dd_.draw();});


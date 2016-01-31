// document
// https://rawgit.com/browserobo/WebGPIO/master/index.html#navigator-gpio

(function () {
  'use strict';
  if (!window.GPIOAccess) {
    window.GPIOAccess = function (port) {
      this.init(port);
    };

    GPIOAccess.prototype = {
      init: function (port) {
        this.ports = new GPIOPortMap();

        navigator.mozGpio.export(port);  //PWM

        this.ports.set(port - 0, new GPIOPort(port));

        console.log('size=' + this.ports.size);
      },
    };
  }
})();


// document
// https://rawgit.com/browserobo/WebGPIO/master/index.html#GPIOPort-interface

(function () {
  'use strict';

  if (!window.GPIOPort) {
    window.GPIOPort = function (portNumber) {
      this.init(portNumber);
    };

    /**
    * The GPIOPort interface represents a GPIO port assigned to a physical GPIO pin.
    **/
    GPIOPort.prototype = {
      init: function (portNumber) {

        /**
        * The portNumber attribute must return the GPIO port number assigned to the GPIOPort object.
        * port番号の属性は gpio portオブジェクトに割り当てられたgpio prot番号を返します。
        **/
        this.portNumber = portNumber;

        /**
        * The portName attribute must return the name of the GPIO port. If the name is unknown, the portName attribute must return an empty string.
        * gpio portの名前を返します。名前が不明の場合、port名は唐文字を返します。
        **/
        this.portName = '';

        /**
        * The pinName attribute must return the name of the GPIO pin. If the name is unknown, the pinName attribute must return an empty string.
        * pinNameは GPIOピンの名前を返します。名前が不明な場合は空文字を返します。
        **/
        this.pinName = '';

        /**
        * The direction attribute must return either	an empty string, "in", or "out".
        *	This value is initially an empty string. This value is set to "in",
        * or "out" when the export() method is invoked and successfully completed based on the argument passed to the method.
        * directionは"in"もしくは"out"、または空文字列を返します。
        * この値は最初は空文字列です。
        * export() メソッドが正常に実行され他場合、この値は"out"または"in"に設定されます。
        **/
        this.direction = '';

        /**
        * The exported attribute	gives	whether the GPIO port has been exported or not.
        * If the GPIO port has been exported, the exported attribute must return true, otherwise false.
        * exportedはGPIOポートがexportされたか否かを返します。
        * GPIOポートがexportされている場合はtrue、exportされていない場合はfalseを返さなければいけません。
        **/
        this.exported = false;

        this._interval = 30;
        this.value = null;
        this._timer = null;
      },

      /**
      * The export() method activate the related GPIO port. When the export() method is invoked, the user agent must run the steps as follows:
      *   1. Let promise be a new Promise object and resolver be its associated resolver.
      *   2. Return promise and run the following steps asynchronously.
      *   3. If the value of the exported attribute is true, jump to the step labeled success below.
      *   4. Let direction be the value of the first argument passed to the method.
      *   5. If direction is neither "in" nor "out", jump to the step labeled failure below.
      *   6. Activate the related GPIO port in the specified direction mode ("in" or "out"). If succeeded, set the exported attribute to true, then jump to the step labeled success below. Otherwise, jump to the step labeled failure below.
      *   7. success: Call resolver's accept() method without any argument. Abort these steps.
      *   8. failure: Let error be a new DOMExceptions. This must be of type "InvalidAccessError" if direction was invalid (i.e. neither "in" nor "out"),
      *     "SecurityError" if this operation was denied by the operating system because of some kind of security reason,
      *     "OperationError" if this operation was failed because of any reasons other than security reason.
      *     Then call resolver's reject(value) method with error as value argument.
      * @todo: SecurityError implementation
      **/
      export: function (direction) {
        return new Promise(exportGPIO)
          .then(sucessHandler)
          .catch(errorHandler);

        var directMap = {
          in: ()=> this._timer = setInterval(()=> _checkValue(this), this._interval),
          out: ()=> this._timer ? clearInterval(this._timer) : 0,
        };

        var exportGPIO = (resolve, reject)=> {
          var directFnc = directMap[direction];

          if (directFnc) {
            navigator.mozGpio.setDirection(this.portNumber, direction === 'out');
            directFnc();
            resolve();
          }else {
            reject(new Error('InvalidAccessError'));
          }
        };

        var sucessHandler = event=> {
          this.direction = direction;
          this.exported = true;

          // @todo set name
          // this.pinName = '';
          // this.portName = '';
          return event;
        };

        var errorHandler = error=> {
          this.direction = '';
          this.exported = false;
          this.pinName = '';
          this.portName = '';
          return Promise.reject(error);
        };
      },

      /**
      * The unexport() method deactivates	the related GPIO port. When the unexport() method is invoked, the user agent must run the steps as follows:
      * @todo: During implementation
      **/
      unexport: function (direction) {},

      /**
      * The read() method reads the value from the related GPIO port. When the read() method is invoked, the user agent must run the steps as follows:
      **/
      read: function () {
        return new Promise(readGPIO);

        var readGPIO = (resolve, reject)=> {
          if (this.exported) {
            if (this.direction !== 'in') {
              reject(new Error('OperationError'));
            }

            resolve(navigator.mozGpio.getValue(this.portNumber));
          } else {

            reject(new Error('InvalidAccessError'));
          }
        };
      },

      /**
      * The write() method writes the value passed as the first argument to the related GPIO port.
      * The value must be numeric 0 or 1. When the write() method is invoked, the user agent must run the steps as follows:
      **/
      write: function (value) {
        return new Promise(writeGPIO);

        var writeGPIO = (resolve, reject)=> {
          if (this.exported) {
            if (this.direction !== 'out') {
              reject(new Error('OperationError'));
            }

            navigator.mozGpio.setValue(this.portNumber, value);

            if (value === 0 || value === 1) {
              this.value = value;
              resolve(this.value);
            } else {
              reject(new Error('OperationError'));
            }
          } else {

            reject(new Error('InvalidAccessError'));
          }
        };
      },

      /**
      * The onchange attribute is a event handler invoked when the value of the GPIO port corresponding to the GPIOPort object changes
      * (i.e. the value changes from 1 to 0 or from 0 to 1).
      * Whenever the event handler is to be invoked, the user agent must run the following steps:
      * @todo: During implementation
      * @type {GPIOChangeEvent}
      **/
      onchange:null,

      checkValue:function (port) {
        port.read().then(
          function (value) {
            if (port.value != null) {
              if (parseInt(value) != parseInt(port.value)) {
                if (typeof (port.onchange) === 'function') {
                  port.onchange(value);
                }else {
                  console.log('port.onchange is not a function.');
                }
              }
            }

            port.value = value;
          },

          function () {
            console.log('check value error');
          }
        );
      },

      // --- old method
      /**
      * @deprecated
      **/
      setDirection: function (direction) {
        return GPIOPort.export(direction);
      },

      isInput: function () {
        return this.direction === 'in';
      },

      /**
      * @private
      **/
      __checkValue: function (port) {
        port.read()
          .then(value => {
            if (parseInt(value) != parseInt(port.value)) {
              if (typeof (port.onchange) === 'function') {
                // fire GPIOChangeEvent
                port.onchange(value);
              }else {
                console.log('port.onchange is not a function.');
              }
            }

            port.value = value;
          }).catch(e=> Promise.reject(new Error('check value error')));
      },
    };
  }
})();


// document
// https://rawgit.com/browserobo/WebGPIO/master/index.html#GPIOPortMap-interface

(function () {
  'use strict';
  if (!window.GPIOPortMap) {
    window.GPIOPortMap = Map;
  }
})();

(function () {
  'use strict';

  if (!navigator.requestGPIOAccess) {
    navigator.requestGPIOAccess = function (port) {
      return new Promise(function (resolve, reject) {

        var gpioAccess = new GPIOAccess(port);
        resolve(gpioAccess);
      });
    };
  }
})();

(function () {
  'use strict';

  if (!navigator.mozGpio) {
    navigator.mozGpio = new Object();
    navigator.mozGpio.export = function (portno) {
    };

    navigator.mozGpio.unexport = function (portno) {
    };

    navigator.mozGpio.setValue = function (portno, value) {
      console.log('setValue(' + portno + ',' + value + ')');
    };

    navigator.mozGpio.getValue = function (portno) {
      return portno;
    };

    navigator.mozGpio.setDirection = function (portno, direction) {
      console.log('setDirection(' + portno + ',' + direction + ')');
    };

    navigator.mozGpio.getDirection = function () {
      return 'out';
    };
  }
})();
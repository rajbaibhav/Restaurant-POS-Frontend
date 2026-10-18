import { OrderItem, MenuItem } from '../types';

// Standard Bluetooth GATT Printer Services
export const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Printer Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent UART
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000fff0-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  '0000af30-0000-1000-8000-00805f9b34fb',
];

export interface PrinterState {
  isConnected: boolean;
  isConnecting: boolean;
  deviceName: string | null;
  error: string | null;
}

export interface ReceiptData {
  tableId: number;
  invoiceId?: string;
  items: OrderItem[];
  menuItems: MenuItem[];
  subtotal: number;
  total: number;
  paymentMethod: 'Cash' | 'Card' | 'UPI';
  date?: Date;
  staffName?: string;
}

class BluetoothPrinterService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private listeners: ((state: PrinterState) => void)[] = [];
  private state: PrinterState = {
    isConnected: false,
    isConnecting: false,
    deviceName: null,
    error: null,
  };

  constructor() {
    // Attempt to register page unload cleanup
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.disconnect();
      });
    }
  }

  public getState(): PrinterState {
    return { ...this.state };
  }

  public subscribe(listener: (state: PrinterState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator && !!navigator.bluetooth;
  }

  /**
   * Request user to pair a Bluetooth thermal printer and connect to its GATT server.
   */
  public async connect(): Promise<boolean> {
    if (!this.isSupported()) {
      this.state = {
        ...this.state,
        error: 'Web Bluetooth is not supported in this browser. Please use Google Chrome or Microsoft Edge.',
      };
      this.notify();
      return false;
    }

    this.state = { ...this.state, isConnecting: true, error: null };
    this.notify();

    try {
      // Prompt user to select their Bluetooth thermal printer
      const device = await navigator.bluetooth!.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICE_UUIDS,
      });

      this.device = device;
      this.state.deviceName = device.name || 'Bluetooth Thermal Printer';

      device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));

      // Connect to GATT server
      const server = await device.gatt!.connect();

      // Find an available printer service
      let targetCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

      for (const serviceUuid of PRINTER_SERVICE_UUIDS) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const characteristics = await service.getCharacteristics();

          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              targetCharacteristic = char;
              break;
            }
          }
          if (targetCharacteristic) break;
        } catch {
          // Continue searching other services
        }
      }

      // If no recognized service UUID matched, query all primary services
      if (!targetCharacteristic) {
        try {
          const services = await server.getPrimaryServices();
          for (const service of services) {
            try {
              const characteristics = await service.getCharacteristics();
              for (const char of characteristics) {
                if (char.properties.write || char.properties.writeWithoutResponse) {
                  targetCharacteristic = char;
                  break;
                }
              }
              if (targetCharacteristic) break;
            } catch {
              // Ignore service query failure
            }
          }
        } catch {
          // Ignore
        }
      }

      if (!targetCharacteristic) {
        throw new Error('Could not find a writable print characteristic on this Bluetooth device.');
      }

      this.characteristic = targetCharacteristic;
      this.state = {
        isConnected: true,
        isConnecting: false,
        deviceName: device.name || 'Thermal POS Printer',
        error: null,
      };
      this.notify();
      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect to Bluetooth printer';
      this.state = {
        isConnected: false,
        isConnecting: false,
        deviceName: null,
        error: errorMsg.includes('cancelled') ? null : errorMsg,
      };
      this.notify();
      return false;
    }
  }

  /**
   * Disconnect the Bluetooth printer
   */
  public disconnect() {
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      try {
        this.device.gatt.disconnect();
      } catch {
        // Ignore error on disconnect
      }
    }
    this.onDisconnected();
  }

  private onDisconnected() {
    this.device = null;
    this.characteristic = null;
    this.state = {
      isConnected: false,
      isConnecting: false,
      deviceName: null,
      error: null,
    };
    this.notify();
  }

  /**
   * Send raw byte buffer to printer in chunks to prevent BLE buffer overflow
   */
  public async sendRawBytes(bytes: Uint8Array): Promise<boolean> {
    if (!this.characteristic || !this.state.isConnected) {
      throw new Error('Printer is not connected. Please connect via Bluetooth first.');
    }

    const CHUNK_SIZE = 100; // Safe chunk size for Bluetooth GATT MTU
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.slice(i, i + CHUNK_SIZE);
      if (this.characteristic.properties.writeWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.characteristic.writeValueWithResponse(chunk);
      }
      // Small delay between chunks to let printer buffer process
      await new Promise((res) => setTimeout(res, 25));
    }
    return true;
  }

  /**
   * Generate 80mm ESC/POS formatted receipt bytes (48 columns)
   */
  public build80mmEscPosReceipt(data: ReceiptData): Uint8Array {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];

    const append = (...bytes: number[]) => {
      chunks.push(new Uint8Array(bytes));
    };

    const appendText = (text: string) => {
      chunks.push(encoder.encode(text));
    };

    // ESC/POS Commands
    const ESC = 0x1b;
    const GS = 0x1d;

    // Initialize printer
    append(ESC, 0x40);

    // Code page PC437
    append(ESC, 0x74, 0x00);

    // Center alignment
    append(ESC, 0x61, 0x01);

    // Double height & double width for Header Title
    append(GS, 0x21, 0x11);
    appendText('EAT & PARK\n');

    // Normal text size
    append(GS, 0x21, 0x00);
    append(ESC, 0x45, 0x01); // Bold ON
    appendText('RESTAURANT & LOUNGE\n');
    append(ESC, 0x45, 0x00); // Bold OFF
    appendText('Multi-Cuisine Fine Dining\n');
    appendText('------------------------------------------------\n');

    // Left alignment for Order Info
    append(ESC, 0x61, 0x00);
    const dateObj = data.date || new Date();
    const dateStr = dateObj.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeStr = dateObj.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    appendText(`Table No   : Table ${data.tableId}\n`);
    if (data.invoiceId) {
      appendText(`Invoice No : ${data.invoiceId}\n`);
    }
    appendText(`Date & Time: ${dateStr} ${timeStr}\n`);
    if (data.staffName) {
      appendText(`Server     : ${data.staffName}\n`);
    }
    appendText(`Payment    : ${data.paymentMethod}\n`);
    appendText('================================================\n');

    // 80mm Columns: 48 chars total
    // Item (24) | Qty (4) | Rate (9) | Amount (11) = 48
    const colHeader =
      'ITEM'.padEnd(24) +
      'QTY'.padStart(4) +
      'RATE'.padStart(9) +
      'AMOUNT'.padStart(11);
    append(ESC, 0x45, 0x01); // Bold ON
    appendText(colHeader + '\n');
    append(ESC, 0x45, 0x00); // Bold OFF
    appendText('------------------------------------------------\n');

    // Line items
    data.items.forEach((item) => {
      const menuInfo = data.menuItems.find((m) => m.id === item.menuItemId);
      const name = menuInfo?.name || 'Item';
      const price = menuInfo?.price || 0;
      const amount = price * item.quantity;

      const qtyStr = item.quantity.toString().padStart(4);
      const rateStr = `Rs.${price}`.padStart(9);
      const amountStr = `Rs.${amount}`.padStart(11);

      if (name.length <= 24) {
        const itemLine = name.padEnd(24) + qtyStr + rateStr + amountStr;
        appendText(itemLine + '\n');
      } else {
        // Multi-line for longer names
        const line1 = name.substring(0, 24) + qtyStr + rateStr + amountStr;
        const line2 = name.substring(24, 48);
        appendText(line1 + '\n');
        appendText(line2 + '\n');
      }
    });

    appendText('------------------------------------------------\n');

    // Totals Section (Right-aligned / formatted)
    const subtotalStr = `Rs. ${Math.round(data.subtotal || data.total)}`;
    appendText('Subtotal:'.padEnd(30) + subtotalStr.padStart(18) + '\n');
    appendText('GST (Included in pricing):'.padEnd(30) + 'Rs. 0'.padStart(18) + '\n');
    appendText('================================================\n');

    // Grand Total (Bold + Double Height)
    append(ESC, 0x45, 0x01); // Bold ON
    append(GS, 0x21, 0x01); // Double height
    const totalStr = `Rs. ${Math.round(data.total)}`;
    appendText('TOTAL PAYABLE:'.padEnd(24) + totalStr.padStart(24) + '\n');
    append(GS, 0x21, 0x00); // Normal size
    append(ESC, 0x45, 0x00); // Bold OFF

    appendText('================================================\n');

    // Footer - Center aligned
    append(ESC, 0x61, 0x01);
    appendText('\nThank you for dining with us!\n');
    appendText('Please visit again\n');
    appendText('*** Powered by Eat & Park POS ***\n\n');

    // Paper feed & Cut command (GS V 66 0 = Partial Cut)
    append(ESC, 0x64, 0x04); // Feed 4 lines
    append(GS, 0x56, 0x42, 0x00); // Cut paper

    // Combine all chunks into single Uint8Array
    const totalLength = chunks.reduce((acc, curr) => acc + curr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
   * Print a customer invoice receipt to the connected Bluetooth printer
   */
  public async printReceipt(data: ReceiptData): Promise<boolean> {
    if (!this.state.isConnected) {
      const connected = await this.connect();
      if (!connected) return false;
    }

    const receiptBytes = this.build80mmEscPosReceipt(data);
    await this.sendRawBytes(receiptBytes);
    return true;
  }

  /**
   * Print a test slip to verify printer connection and alignment
   */
  public async printTestSlip(): Promise<boolean> {
    if (!this.state.isConnected) {
      const connected = await this.connect();
      if (!connected) return false;
    }

    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const append = (...bytes: number[]) => chunks.push(new Uint8Array(bytes));
    const appendText = (text: string) => chunks.push(encoder.encode(text));

    append(0x1b, 0x40); // Init
    append(0x1b, 0x61, 0x01); // Center
    append(0x1d, 0x21, 0x11); // Double size
    appendText('EAT & PARK\n');
    append(0x1d, 0x21, 0x00); // Normal size
    appendText('BLUETOOTH PRINTER TEST\n');
    appendText('------------------------------------------------\n');
    append(0x1b, 0x61, 0x00); // Left
    appendText(`Device   : ${this.state.deviceName || 'POS Printer'}\n`);
    appendText(`Status   : Connected & Ready (80mm / 48 Col)\n`);
    appendText(`Timestamp: ${new Date().toLocaleString()}\n`);
    appendText('------------------------------------------------\n');
    append(0x1b, 0x61, 0x01); // Center
    appendText('Printing test successful!\n');
    append(0x1b, 0x64, 0x04); // Feed
    append(0x1d, 0x56, 0x42, 0x00); // Cut

    const totalLength = chunks.reduce((acc, curr) => acc + curr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    await this.sendRawBytes(result);
    return true;
  }
}

export const bluetoothPrinter = new BluetoothPrinterService();

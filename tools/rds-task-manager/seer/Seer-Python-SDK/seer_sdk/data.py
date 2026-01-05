import binascii
import struct
import logging
import json


HEADER_STRUCT = ">bbhih" #big-endian 
REVERSED = struct.pack('b'*6, *([0]*6))


class SeerData(object):
    def __init__(self):
        self.sync = 0x5A
        self.version = 1
        self.number = 0
        self.data_length = 0
        self.api_type = 0
        self.data = {}
        self.empty = True

    def from_bytes(self, bytes):
        self.bytes = bytes

        # Unpack header
        self.sync, self.version, self.number, self.data_length, self.api_type = struct.unpack(
            HEADER_STRUCT, bytes[:10])

        # Unpack data
        data = bytes[16:].decode('utf-8')
        # print(data)
        self.data = json.loads(data)
        self.bytes_list = [bytes[:10], bytes[10:16], bytes[16:]]
        self.empty = False

    def from_data(self, number, api_type, data=None):

        # Init variable
        self.data = data
        self.number = number
        self.api_type = api_type
        self.data = data

        # Data serialization
        if data:
            data_serialization = json.dumps(self.data).replace(' ', '')
            self.data_length = len(data_serialization)

        header_bytes = struct.pack(
            HEADER_STRUCT,
            self.sync,
            self.version,
            self.number,
            self.data_length,
            self.api_type) + REVERSED
        if data:
            data_bytes = bytearray(data_serialization, encoding='utf-8')
            # Conbine to generate bytes
            self.bytes = header_bytes + data_bytes
            # For better print
            self.bytes_list = [header_bytes, data_bytes]
        else:
            self.bytes = header_bytes
            self.bytes_list = [header_bytes]
        self.empty = False

    # Print the hex string
    def __str__(self):
        hex_str = " : ".join([str(binascii.hexlify(i))[2:-1]
                              for i in self.bytes_list])
        return hex_str

    # Better print the data
    def print_data(self):
        print(json.dumps(self.data, indent=4, sort_keys=True))


# Test
if __name__ == "__main__":
    data = {"x": 10.0, "y": 3.0, "angle": 0}
    print(json.dumps(data).replace(' ', ''))

    seerData = SeerData()
    seerData.from_data(1, 2002, data)
    print(len(seerData.bytes))
    assert len(seerData.bytes) == 44
    print(seerData)
    seerData2 = SeerData()
    seerData2.from_bytes(seerData.bytes)
    seerData2.print_data()

import socket
import time
import random
import logging

from seer_sdk.data import SeerData


class Connector(object):
    def __init__(self, ip_address, port, timeout=100):
        self.ip_address = ip_address
        self.port = port
        self.timeout = timeout
        self.number = random.choice(range(0, 32767))
        self._socket = socket.socket(
            socket.AF_INET, socket.SOCK_STREAM)
        self.is_connected = False
        self.last_data = None
        self._socket.settimeout(timeout)

    def __del__(self):
        self.close()

    def connect(self):
        return_ = self._socket.connect((self.ip_address, self.port))
        if return_ == None or return_ == 0:
            self.is_connected = True
        else:
            self.is_connected = False

    def close(self):
        self._socket.close()
        self.is_connected = False
        logging.info("the socket is closed")

    def send(self, api_type, data=None):
        """Send the data by the socket connection"""
        """Return the returned data or error"""
        # Create the seer data package
        send_data = SeerData()
        send_data.from_data(self.number, api_type, data)

        # Determine whether the socket is connected
        if self.is_connected:
            received_bytes = None
            received_data = SeerData()
            try:
                # Send all data
                self._socket.sendall(send_data.bytes)
            except Exception as e:
                logging.error("error to send %s data to %s:%s, because: %s" % (
                    api_type, self.ip_address, self.port, str(e)))
            else:
                try:
                    received_bytes = self._socket.recv(8096)
                    # print(received_bytes[16])
                    # print(received_bytes[-1])
                    # print(len(received_bytes))
                    while(received_bytes[16] ==123 and received_bytes[-1] != 125):
                        received_bytes += self._socket.recv(1024 * 1024)
                except Exception as e:
                    logging.error("error to receive callback data from %s:%s, because: %s" % (
                        self.ip_address, self.port, str(e)))
                else:
                    try:
                        received_data.from_bytes(received_bytes)
                    except Exception as e:
                        logging.error("Error for unpacking received packet for %s with %s: %s" % (
                            api_type, len(received_bytes), str(e)))
                        return (False, None)
                    # the number of callback's packet should match the socket's number
                    if received_data.number == self.number:
                        logging.info("success send %s to %s:%s" %
                                     (str(data), self.ip_address, self.port))
                        logging.info("success receive %s from %s:%s" % (
                            str(received_data.data), self.ip_address, self.port))
                        self.last_data = received_data
                        return (True, received_data)
                    else:
                        logging.warning(
                            "the callback data's number mismatches the socket's number")
                        return (False, None)

        else:
            logging.warning("the socket haven't been connected!")
        return (False, None)

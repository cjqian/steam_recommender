import socket
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.connect(("localhost", 8080))
s.sendall(str(76561198060927907) + " 5 3")
s.close()



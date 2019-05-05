"""
Simplified chat demo for websockets.
Authentication, error handling, etc are left as an exercise for the reader :)
"""

import logging
import tornado.escape
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.websocket
import os.path
import uuid
import random

from tornado.options import define, options

from config.settings import *
from config.constants import *

define("port", default=PORT, help="run on the given port", type=int)


class Application(tornado.web.Application):
    def __init__(self):
        handlers = [(r"/", MainHandler), (r"/gamesocket", GameSocketHandler)]
        settings = dict(
            cookie_secret="asdfkj23raslfk23r2",
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            xsrf_cookies=True,
        )
        super(Application, self).__init__(handlers, **settings)


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("index.html", messages=GameSocketHandler.cache)


class GameSocketHandler(tornado.websocket.WebSocketHandler):
    waiters = set()
    cache = {"players": {}, "bullets": []}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs) # :)
        self.player_id = None

    def get_compression_options(self):
        # Non-None enables compression with default options.
        return {}

    def check_origin(self, origin):
        return True

    def open(self):
        print("Player connected")
        GameSocketHandler.waiters.add(self)
        players = self.cache.get("players")
        new_player_id = str(uuid.uuid4())

        # Store player id on this handler instance
        self.player_id = new_player_id

        new_player = {
            "id": new_player_id,
            "x": random.randint(0, 800),
            "y": random.randint(0, 600),
            "rotation": random.randint(0, 360),
            "acceleration": 0,
            "keys": {
                "up": False,
                "left": False,
                "right": False
            }
        }
        players[new_player_id] = new_player
        # Send back the game settings
        self.write_message(
            {
                "status": "success",
                "state": self.cache,
                "type": "INITIAL_STATE",
                "settings": {
                    "player_id": new_player_id,
                    "room_friction": 1,
                    "player_max_speed": 5,
                    "player_acceleration": 0.5,
                    "player_rotation_speed": 25,
                    "bullet_speed": 20,
                    "max_bullets_per_player": 1,
                    "bullet_lifespan": 3,
                },
            }
        )
        for waiter in self.waiters:
            if waiter == self:
                continue
            try:
                waiter.write_message(
                    {
                        "type": PLAYER_JOINED,
                        "new_player": new_player,
                    }
                )
            except:
                logging.error("Error sending message", exc_info=True)

    def on_close(self):
        print("Player disconnected")
        GameSocketHandler.waiters.remove(self)

        for waiter in self.waiters:
            try:
                waiter.write_message(
                    {
                        "type": PLAYER_LEFT,
                        "player_id": self.player_id,
                    }
                )
            except:
                logging.error("Error sending message", exc_info=True)

    @classmethod
    def update_cache(cls, message):
        message_type = message.get("message_type", None)
        data = message.get("data", None)
        if data is None:
            return
        if message_type == PLAYER_POSITION:
            for pid, p in cls.cache.get("players").items():
                if pid == data.get("id"):
                    p["x"] = data.get("x")
                    p["y"] = data.get("y")
                    p["rotation"] = data.get("rotation")
                    p["acceleration"] = data.get("acceleration")
        elif message_type == PLAYER_SHOOT:
            cls.cache["bullets"].append(
                {
                    "player_id": data.get("player_id"),
                    "startx": data.get("startx"),
                    "starty": data.get("starty"),
                    "rotation": data.get("rotation"),
                    "speed": BULLET_SPEED,
                }
            )
        elif message_type == PLAYER_KEY:
            for pid, p in cls.cache.get("players").items():
                if pid == data.get("id"):
                    p["x"] = data.get("x")
                    p["y"] = data.get("y")
                    p["rotation"] = data.get("rotation")
                    p["acceleration"] = data.get("acceleration")
                    p["keys"][data.get("key")] = data.get("pressed")

    @classmethod
    def send_updates(cls, data):
        logging.info("sending message to %d waiters", len(cls.waiters))
        for waiter in cls.waiters:
            try:
                waiter.write_message({"state": cls.cache, "type": data.get("message_type")})
            except:
                logging.error("Error sending message", exc_info=True)

    def on_message(self, message):
        print("on message")
        logging.info("got message %r", message)
        parsed = tornado.escape.json_decode(message)

        # body = {"id": str(uuid.uuid4()), "data": parsed["data"]}
        GameSocketHandler.update_cache(parsed)
        GameSocketHandler.send_updates(parsed)


def main():
    tornado.options.parse_command_line()
    app = Application()
    app.listen(options.port)
    tornado.ioloop.IOLoop.current().start()


if __name__ == "__main__":
    print("Starting server on port {}".format(PORT))
    main()

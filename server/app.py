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

    def get_compression_options(self):
        # Non-None enables compression with default options.
        return {}

    def open(self):
        GameSocketHandler.waiters.add(self)
        players = self.cache.get("players")
        new_player_id = str(uuid.uuid4())
        new_player = {
            "x": random.randint(0, 800),
            "y": random.randint(0, 600),
            "direction": random.randint(0, 360),
            "velocity": 0,
        }
        players[new_player_id] = new_player
        # Send back the game settings
        self.write_message(
            {
                "status": "success",
                "state": self.cache,
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

    def on_close(self):
        GameSocketHandler.waiters.remove(self)

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
                    p["direction"] = data.get("direction")
                    p["velocity"] = data.get("velocity")
        elif message_type == PLAYER_SHOOT:
            cls.cache["bullets"].append(
                {
                    "player_id": data.get("player_id"),
                    "startx": data.get("startx"),
                    "starty": data.get("starty"),
                    "direction": data.get("direction"),
                    "speed": BULLET_SPEED,
                }
            )

    @classmethod
    def send_updates(cls, data):
        logging.info("sending message to %d waiters", len(cls.waiters))
        for waiter in cls.waiters:
            try:
                waiter.write_message({"state": cls.cache})
            except:
                logging.error("Error sending message", exc_info=True)

    def on_message(self, message):
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

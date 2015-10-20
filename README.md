# A Simple SparkPost Webhook Consumer

This service presents a set of SparkPost Webhook endpoints and a web UI to display events as they are received.

### Setup

```
git clone https://github.com/ewandennis/possum possum
cd possum
bower install
npm install
npm run dev
```

You now have a webhook event viewer service listening on port 3000. To begin using it:

* Visit the service web interface at http://localhost:3000/ 
* Add a new webhook endpoint by typing its name and clicking 'create endpoint'.
* Select your new endpoint from the list to view events sent to it.
* Register your endpoint URL with a SparkPost, Elite or Momentum 4.2+ instance to begin receiving events.


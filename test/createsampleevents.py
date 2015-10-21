import subprocess
import json
import os.path

eventtypes = ["injection", "delay", "delivery", "bounce", "out_of_band", "spam_complaint", "policy_rejection",
  "open", "click",
  "generation_failure", "generation_rejection",
  "list_unsubscribe", "link_unsubscribe"]

events = []
for evttype in eventtypes:
  evtfilename = "%s.json" % evttype

  if os.path.isfile(evtfilename):
    events.append(json.loads(open(evtfilename, "r").read()))
    continue

  p = subprocess.Popen("curl https://api.sparkpost.com/api/v1/webhooks/events/samples?events=%s" % evttype, shell=True, stdout=subprocess.PIPE)
  output = ""
  while True:
    ch = p.stdout.read(1)
    if ch == '' and p.poll() != None:
      break
    output += ch

  event = json.loads(output)['results'][0]
  events.append(event)
  jsonfile = open(evtfilename, "w")
  jsonfile.write(json.dumps(event))
  jsonfile.close()

events.append(json.loads(open("ping.json", "r").read()))

allevents = open("allevents.json", "w")
allevents.write('[')
allevents.write(','.join([json.dumps(evt, indent=2, separators=(',',': ')) for evt in events]))
allevents.write(']')
allevents.close()

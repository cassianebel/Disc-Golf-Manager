# Description

The Disc Golf Disc Manager is a mobile application that allows disc golf players to track and organize their collection of discs in one convenient place. Users would be able to add individual discs to their collection and record information such as the brand, mold, weight, color, plastic type, and current condition. They could also upload photos and add personal notes about each disc, including observations about its flight characteristics and how well it performs for different types of throws. This app could help solve the organizational problems that come with owning a growing collection of discs. Players may have difficulty remembering which discs they own, the specific characteristics of each disc, or how a particular disc performs on the course. Keeping this information in a mobile app would make it easily accessible while playing or shopping for new discs, helping users avoid unnecessary duplicate purchases and make more informed decisions about which disc to use for a particular shot. Overall, the app would provide disc golfers with a simple way to manage their equipment and build a useful record of their experiences with each disc.

# Goals

- Support adding a disc to the user's bag via photo and OCR and [trydiscs](https://api.trydiscs.com/)
- Create a bag (collection) of discs for the user

# Domain Model

The Disc Golf Disc Manager contains users, bags, and discs. Each user has a bag that contains a list of their discs. Each disc will have a photo and information about the disc including brand name, disc name, disc type, speed, glide, turn, fade, stability, bead, additional specs, and user notes about the disc.

# Actors

- User - can add discs to their bag, and update individual disc info.

# Objects

- Disc - a listing containg information about a disc the user physically owns
- Bag - a collection of disc objects

# Functional Requirements

- FR-001: The Disc Golf Disc Manager must allow a user to add discs to their bag.
- FR-002: The Disc Golf Disc Manager must allow the user to update the information for each individual disc.
- FR-003: The Disc Golf Disc Manager home screen must display a bag of the user's disc.

# Acceptance Criteria

- Scenario-001: User adds a disc
  {
  Given that the user is logged in to Disc Golf Disc Manager,
  And the user clicks the add disc button,
  When the user takes a photo of their disc,
  Then the user should be presented with a brand name and disc name,
  When the user confirms they disc brand and name,
  Then they should be presented with a list of possible matches from [trydiscs](https://api.trydiscs.com/),
  When the user selects the matching disc record they should be presented with all the disc's information to edit and confirm,
  When the user confirms by clicking the add disc to bag button,
  Then the disc should be added to the user's bag
  }
- Scenario-002: User updates a disc's information
  {
  Given that the user is logged in to Disc Golf Disc Manager,
  And clicks on a disc in their bag listing,
  Then the user should be presented with all the disc's information as editable inputs,
  When the user is done editing the inputs and clicks submit,
  The disc's record should be updated,
  And the user is returned to the home screen
  }

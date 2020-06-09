<template v-for="item in items">
  <v-app id="inspire">
    <v-card height="100%">
      <v-toolbar flat>

        <v-row justify="center" width="100%">
          <v-toolbar-title>사랑스러운 강아지</v-toolbar-title>
        </v-row>




        <v-btn icon>
          <v-icon>mdi-translate</v-icon>
        </v-btn>

        <v-btn icon @click="dialog1 = !dialog1">
          <v-icon>mdi-account</v-icon>
        </v-btn>

        <v-dialog v-model="dialog1" width="600px">
          <v-card>
            <v-card-title>
              My Profiles
            </v-card-title>
            <v-container>
              <v-row class="mx-2">
                <v-col class="align-center justify-space-between" cols="12">
                  <v-row align="center" class="mr-0">
                    <v-avatar size="40px" class="mx-3">
                      <img src="//ssl.gstatic.com/s2/oz/images/sge/grey_silhouette.png" alt="">
                    </v-avatar>
                    <v-text-field placeholder="Raywon"></v-text-field>
                  </v-row>
                </v-col>
                <v-col cols="6">
                  <v-text-field prepend-icon="mdi-account-card-details-outline" placeholder="Machine Learning Developer"></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-text-field placeholder="Researcher"></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field prepend-icon="mdi-mail" placeholder="Email"></v-text-field>
                </v-col>
              </v-row>
            </v-container>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn text @click="dialog1 = false; openurl(address[0]);">
                <v-icon>mdi-youtube</v-icon>
              </v-btn>
              <v-btn text @click="dialog1 = false; openurl(address[1]);">
                <v-icon>mdi-instagram</v-icon>
              </v-btn>
              <v-btn text @click="dialog1 = false; openurl(address[2]);">
                <v-icon>mdi-github</v-icon>
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>


        <v-btn icon @click="dialog2 = !dialog2">
          <v-icon>mdi-email</v-icon>
        </v-btn>

        <v-dialog v-model="dialog2" width="800px">
          <v-card>
            <v-card-title class="blue darken-2">
              Contact
            </v-card-title>
            <v-container>
              <v-row class="mx-2">
                <v-col class="align-center justify-space-between" cols="12">
                  <v-row align="center" class="mr-0">
                    <v-avatar size="40px" class="mx-3">
                      <img src="//ssl.gstatic.com/s2/oz/images/sge/grey_silhouette.png" alt="">
                    </v-avatar>
                    <v-text-field placeholder="Name"></v-text-field>
                  </v-row>
                </v-col>
                <v-col cols="6">
                  <v-text-field prepend-icon="mdi-account-card-details-outline" placeholder="Company"></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-text-field placeholder="Job title"></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field prepend-icon="mdi-mail" placeholder="Email"></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field type="tel" prepend-icon="mdi-phone" placeholder="(000) 000 - 0000"></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field prepend-icon="mdi-text" placeholder="Notes"></v-text-field>
                </v-col>
              </v-row>
            </v-container>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn text color="primary" @click="dialog2 = false">Cancel</v-btn>
              <v-btn text @click="dialog2 = false">Sand</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>




        <template v-slot:extension>
          <v-tabs v-model="tabs" fixed-tabs>
            <v-tabs-slider></v-tabs-slider>
            <v-tab href="#mobile-tabs-1-1" class="primary--text">
              <v-icon>mdi-phone</v-icon>
            </v-tab>

            <v-tab href="#mobile-tabs-1-2" class="primary--text">
              <v-icon>mdi-heart</v-icon>
            </v-tab>

            <v-tab href="#mobile-tabs-1-3" class="primary--text">
              <v-icon>mdi-account-box</v-icon>
            </v-tab>

            <v-tab href="#mobile-tabs-1-4" class="primary--text">
              <v-icon>mdi-email</v-icon>
            </v-tab>


          </v-tabs>
        </template>
      </v-toolbar>

      <v-tabs-items v-model="tabs" >
        <v-tab-item v-for="i in 4" :key="i" :value="'mobile-tabs-1-' + i">

          <v-card flat v-if="i == 1">
            <v-card-text v-text="items[0].text"></v-card-text>
          </v-card>

          <v-card flat  v-if="i == 2">
            <v-card-text v-text="items[1]"></v-card-text>
          </v-card>

          <v-card flat  v-if="i == 3">
            <v-card-text v-text="items[2]"></v-card-text>
          </v-card>

          <v-card flat  v-if="i == 4">
            <v-card-text v-text="items[3]"></v-card-text>
          </v-card>


        </v-tab-item>
      </v-tabs-items>
    </v-card>

    <!-- v-email button  -->

    <v-menu transition="fab-transition">
      <template v-slot:activator="{ on }">
        <v-btn bottom color="blue darken-2" dark fab fixed right v-on=" on ">
          <v-icon>mdi-share-variant</v-icon>
        </v-btn>
      </template>
      <v-list>
        <v-btn color="primary" fab> index1</v-btn>
        <v-btn color="strong" fab>index2</v-btn>
      </v-list>
    </v-menu>

  </v-app>
</template>

<script>
  export default {
    props: {
      source: String,
    },
    data: () => ({
      tabs: null,
      page: [1, 2, 3, 4],
      text: "ssibal",
      dialog1: false,
      dialog2: false,
      address: [
        'https://www.youtube.com/mrwjs0803',
        'https://www.instagram.com/ray._.won',
        'https://www.github.com/raywon'],

      drawer: null,
      items: [
        { text: '영범이 고추 3cm', age: '14살' },
        { text: '장현이 고추 3cm' },
        { text: '용진이 고추 3cm' },
        { text: 'ㄱㅎ' }

      ],
    }),
    methods: {
      openurl(url){
        window.open(url)

      }

    }
  }
</script>
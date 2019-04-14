var WebSocketServer = require('websocket').server;
var http 			= require('http');
var safeJson	    = require('safe-json-stringify');

var juego = {
				clientes   	   : new Array(),
				pregunta_actual: 0,	
				preguntas  	   : [
									{
										idpreg   : 1,
										consigna : "¿Cual es la capital de Croacia?",
										opciones : [
														{item:"a",texto:"Buenos aires"},
														{item:"b",texto:"Pekin"},
														{item:"c",texto:"Zagreb"},
														{item:"d",texto:"Waterloo"}
												   ],
										respuesta : "c"
									},
									{
										idpreg   : 2,									
										consigna : "¿Quien es enemigo de GOKU DBZ?",
										opciones : [
														{item:"a",texto:"Bulma"},
														{item:"b",texto:"Piccoro"},
														{item:"c",texto:"Freezer"}
												   ],
										respuesta : "c"												   
									},
									{
										idpreg   : 3,
										consigna : "Simbolo quimico del Sodio",
										opciones : [
														{item:"a",texto:"Na"},
														{item:"b",texto:"H20"},
														{item:"c",texto:"Fe"},
														{item:"d",texto:"Co"}
												   ],
										respuesta : "a"												   
									}								
								 ],
				respuestas     : [],
				traerGanadores : function()
				{
					//Traigo la respuesta.
					var respuesta = this.preguntas[this.pregunta_actual].respuesta;
					
					var ganadores = new Array();
					
					//Revisar las respuestas de los jugadores.
					for (var i=0;i<=this.respuestas.length-1;i++)
					{
						var reply = this.respuestas[i];
						
						if (reply.resultado==respuesta)
							ganadores.push(reply.jugador);
					}
					
					return ganadores;
				}
			};

var servidor = {
					webServer  : http.createServer(function(request, response){}),					
					conexiones :{
									contador  : 0,
									lista     : new Array()
								},								
					json_msj   : function(array)
					{
						return safeJson(array)				
					},					
					random     : function(max)
					{
						return Math.floor((Math.random() * max) + 1);				
					},
					total_clientes : function()
					{
						var cont = 0;						
						
						for (var i=0;i<=this.conexiones.lista.length-1;i++)
						{
							var cli = this.conexiones.lista[i];
							
							if (cli.id!='screen_trivia')
								cont++;
						}
						
						return cont;
					},
					buscar_id      : function(id)
					{
						for (var i=0;i<=this.conexiones.lista.length-1;i++)
						{
							var conx = this.conexiones.lista[i];
							
							if (conx.id == id)
							{
								return conx;
							}
						}
						
						return null;
					},
					notificar_win  : function(lista)
					{
						//Recorro la lista de conexiones para enviar mensajes de exito.
						for (var i=0;i<=lista.length-1;i++)
						{
							var win  = lista[i];
							var resp = this.buscar_id(win);
							
							if (resp!=null)
								resp.send(this.json_msj({type:'win'}));
						}
					},
					notificar_nowin  : function()
					{
						//Recorro la lista de conexiones para enviar mensajes de exito.
						for (var i=0;i<=this.conexiones.lista.length-1;i++)
						{
							var cnx  = this.conexiones.lista[i];
							cnx.send(this.json_msj({type:'nobody_win'}));
						}
					},
					nueva_pregunta  : function()
					{
						var pregunta = juego.preguntas[juego.pregunta_actual];					
						var pantalla = this.buscar_id('screen_trivia');
						pantalla.sendUTF(this.json_msj({type:'game_questions',consigna:pregunta.consigna,lista:pregunta.opciones}));
							
						//Recorro la lista de conexiones para enviar mensajes de exito.
						for (var i=0;i<=this.conexiones.lista.length-1;i++)
						{
							juego.respuestas=new Array();
							var cnx  = this.conexiones.lista[i];
							var pregunta = juego.preguntas[juego.pregunta_actual];
							cnx.sendUTF(this.json_msj({type:'game_questions',lista:pregunta.opciones}));
						}
					},
					enviar_ganadores_pantalla:function(ganadores)
					{
						if (ganadores!=null)
						{
							var winTXT = "";
							
							for (var i=0;i<=ganadores.length-1;i++)
							{
								var win  = ganadores[i];
								var conx = this.buscar_id(win);
								
								if (conx!=null)
									winTXT = winTXT+conx.nombre+", ";
							}
							
							var pantalla = this.buscar_id('screen_trivia');
							pantalla.sendUTF(this.json_msj({type:'win_txt',nombres:winTXT}));
						}
						else
						{
							var pantalla = this.buscar_id('screen_trivia');
							pantalla.sendUTF(this.json_msj({type:'no_win_txt'}));
						}
					},
					analizar_json  : function(json,conexion)
					{
						var obj = JSON.parse(json);

						//Registro la conexion de la pantalla.
						if (obj.type=='screen_conect')
						{
							conexion.id='screen_trivia';
							this.conexiones.lista.push(conexion);
							console.log('Se registro la conexion de la pantalla.');
							
							//Envia la respuesta de la conexion.
							conexion.sendUTF(this.json_msj({type:'screen_conect_ok'}));
							
							//Envio la pregunta acutal.
							var pregunta = juego.preguntas[juego.pregunta_actual];
							var pantalla = this.buscar_id('screen_trivia');
							pantalla.sendUTF(this.json_msj({type:'game_questions',consigna:pregunta.consigna,lista:pregunta.opciones}));
						}
						
						//Registro la conexion del jugador.
						if (obj.type=='player_conect')
						{
							this.conexiones.contador++;
							conexion.id     = 'jugador_trivia_'+this.conexiones.contador;
							conexion.nombre = obj.name;
							this.conexiones.lista.push(conexion);
							console.log('Se registro la conexion del jugador '+conexion.id);							
							conexion.sendUTF(this.json_msj({type:'player_conect_ok',newid:conexion.id}));
							var pantalla = this.buscar_id('screen_trivia');
							pantalla.sendUTF(this.json_msj({type:'new_user',id:conexion.id,user:conexion.nombre}));
						}
												
						//Obtengo la solicitud de la pregunta actual.
						if (obj.type=='request_question')
						{
							var pregunta = juego.preguntas[juego.pregunta_actual];
							conexion.sendUTF(this.json_msj({type:'game_questions',lista:pregunta.opciones}));
						}
						
						//Cuando obtengo la respuesta.
						if (obj.type=='reply')
						{
							juego.respuestas.push({jugador:obj.id,resultado:obj.resultado});
							
							//Revisar si la cantidad de respuestas es del total de jugadores.
							if (juego.respuestas.length==this.total_clientes())
							{
								//Trae los ganadores.
								var ganadores = juego.traerGanadores();		
								
								//Notifica si hubo ganadores y sino, avisa que nadie gano.
								if (ganadores.length>0)
								{
									this.notificar_win(ganadores);									
									this.enviar_ganadores_pantalla(ganadores);
								}
								else
								{
									this.notificar_nowin();
									this.enviar_ganadores_pantalla(null);
								}
									
								//Pasa a la prox pregunta.
								if ((juego.pregunta_actual+1)!=juego.preguntas.length)
								{
									juego.pregunta_actual++;
									
									//Notifico que se va enviar nuevas preguntas a los playes.
									this.nueva_pregunta();
								}
							}
						}						
					},
					json_msj: function (array)
					{
						return safeJson(array)
					}
			   };

servidor.webServer.listen(3000, function()
{
	console.log("***************************");
	console.log("*  GAMESERVER 3 INICIADO  *");
	console.log("***************************");	
});

servidor.webSocket = new WebSocketServer(
{
	httpServer: servidor.webServer
});

servidor.webSocket.on('request', function(request)
{
	//Cuando recibo una conexion, la acepto y lo guardo en una variable.
	var connection = request.accept(null, request.origin);
	
	//Muestro la nueva conexion.
	console.log("Nueva conexión recibida.");
	
	//Cuando se recibe un mensaje.
	connection.on('message', function(message)
	{
	   //Si el mensaje es del formato utf.
	   if (message.type === 'utf8')
		{
			//Muestro el mensaje si tiene id.
			if (connection.idconexion!=null)
				console.log("Mensaje recibido, sin id asociado");
			else
				console.log("Mensaje de socket "+connection.idconexion);				
			
			//Muestro el mensaje entrante.
			console.log(message.utf8Data);
			
			//Analizo el mensaje recibido.
			servidor.analizar_json(message.utf8Data,connection);
		}
	});

	connection.on('close', function(connection)
	{
		console.log("Desconexión, socket "+this.idconexion);
	});
});